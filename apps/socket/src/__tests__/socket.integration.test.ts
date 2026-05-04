import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { createId } from '@paralleldrive/cuid2';
import jwt from 'jsonwebtoken';
import type { PrismaClient } from '@matcha/prisma';
import type { RedisManager } from '@matcha/redis';

let prisma: PrismaClient;
let serverRedisManager: RedisManager;
let testRedisManager: RedisManager;
const WS_PORT = 8081;
const WS_URL = `ws://localhost:${WS_PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('WebSocket Integration Tests', () => {

  beforeAll(async () => {
    process.env.WS_PORT = WS_PORT.toString();

    const prismaModule = await import('@matcha/prisma');
    prisma = prismaModule.default as unknown as PrismaClient;

    const redisModule = await import('../services/redis.js');
    serverRedisManager = redisModule.redisManager;

    const { RedisManager } = await import('@matcha/redis');
    testRedisManager = new RedisManager(process.env.REDIS_URL!);

    await import('../index.js');
    await sleep(500);
  }, 20000);

  afterAll(async () => {
    await testRedisManager.quit();
    await serverRedisManager.quit();
  });

  async function createAuthUser() {
    const userId = createId();
    const sessionId = createId();
    const profileId = createId();
    await prisma.user.create({
      data: { id: userId, email: `${userId}@test.com`, password: 'hashed' }
    });
    await prisma.userProfile.create({
      data: {
        id: profileId, userId, username: `ws_${userId.substring(0, 6)}`,
        avatarUrl: '', location: 'Bengaluru', locationLatitude: 0, locationLongitude: 0, interest: []
      }
    });
    await serverRedisManager.auth.cacheSession(userId, sessionId, profileId, true);
    const token = jwt.sign({ id: userId, sessionId}, JWT_SECRET);
    return { userId, profileId, token };
  }

  it('should reject socket upgrade requests without a valid JWT cookie', async () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      
      ws.on('error', (err: any) => {
        expect(err.message).toContain('401');
        resolve();
      });
      
      ws.on('open', () => {
        ws.on('close', () => reject(new Error('Connection should have been rejected.')));
        ws.close();
      });
    });
  });

  it('should authenticate valid tokens and map the socket in Redis', async () => {
    const { profileId, token } = await createAuthUser();
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(WS_URL, {
        headers: { Cookie: `token=${token}` }
      });
      
      ws.on('open', async () => {
        try {
          await sleep(100);
          const isOnline = await serverRedisManager.userConnection.checkUserStatus(profileId);
          const socketCount = await serverRedisManager.userConnection.countSockets(profileId);
          expect(isOnline).toBe(true);
          expect(socketCount).toBeGreaterThan(0);
          ws.on('close', () => setTimeout(() => resolve(), 100));
          ws.close();
        } catch(e) {
          ws.on('close', () => reject(e));
          ws.close();
        }
      });
      
      ws.on('error', reject);
    });
  });

  it('should route Redis Pub/Sub messages directly to the targeted WebSocket client', async () => {
    const { profileId, token } = await createAuthUser();
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(WS_URL, {
        headers: { Cookie: `token=${token}` }
      });

      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          expect(parsed.type).toBe('SYSTEM_EVENT');
          expect(parsed.payload.message).toBe('Hello from Redis!');
          ws.on('close', () => setTimeout(() => resolve(), 100));
          ws.close();
        } catch (e) {
          ws.on('close', () => reject(e));
          ws.close();
        }
      });

      ws.on('open', async () => {
        try {
          await sleep(500);
          
          const payload = JSON.stringify({
            receiverId: profileId,
            eventType: 'SYSTEM_EVENT',
            eventData: { message: 'Hello from Redis!' }
          });
          await testRedisManager.chat.publish('chat_router', payload);
        } catch (err) {
          ws.on('close', () => reject(err));
          ws.close();
        }
      });

      ws.on('error', reject);
    });
  });
});