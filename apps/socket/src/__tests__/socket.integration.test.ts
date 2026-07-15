import type { PrismaClient } from '@matcha/prisma';
import type { AuthManager, RedisClient, UserConnectionManager } from '@matcha/redis';
import { createId } from '@paralleldrive/cuid2';
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';

let prisma: PrismaClient;
let serverAuthManager: AuthManager;
let serverUserConnectionManager: UserConnectionManager;
let closeServerRedis: () => Promise<void>;
let testPubClient: RedisClient;
const WS_PORT = 8081;
const WS_URL = `ws://localhost:${WS_PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForRedisState(checkFn: () => Promise<boolean>, maxWaitMs = 2000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await checkFn()) return true;
    await sleep(50);
  }
  return false;
}

describe('WebSocket Integration Tests', () => {

  beforeAll(async () => {
    process.env.WS_PORT = WS_PORT.toString();

    const prismaModule = await import('@matcha/prisma');
    prisma = prismaModule.default as unknown as PrismaClient;

    const redisModule = await import('../services/redis.js');
    serverAuthManager = redisModule.authManager;
    serverUserConnectionManager = redisModule.userConnectionManager;
    closeServerRedis = redisModule.closeRedisConnections;

    const { createRedisClient } = await import('@matcha/redis');
    testPubClient = createRedisClient(process.env.REDIS_URL!, "PUBSUB_PUB");

    await import('../index.js');
    await sleep(500);
  }, 20000);

  afterAll(async () => {
    if (testPubClient) await testPubClient.quit();
    if (closeServerRedis) await closeServerRedis();
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
    await serverAuthManager.cacheSession(userId, sessionId, profileId, true);
    const token = jwt.sign({ id: userId, sessionId}, JWT_SECRET);
    return { userId, profileId, token, sessionId };
  }

  describe('Connection & Authentication Handshake', () => {
    it('should reject socket upgrade requests without a valid JWT cookie', async () => {
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        ws.on('error', (err: any) => {
          expect(err.message).toContain('401');
          resolve();
        });
        ws.on('open', () => {
          ws.close();
          reject(new Error('Connection should have been rejected.'));
        });
      });
    });

    it('should reject the upgrade if the JWT is malformed', async () => {
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(WS_URL, { headers: { Cookie: 'token=this.is.not.a.valid.jwt' } });
        ws.on('error', (err: any) => {
          expect(err.message).toContain('401');
          resolve();
        });
        ws.on('open', () => {
          ws.close();
          reject(new Error('Malformed JWT should have been rejected.'));
        });
      });
    });

    it('should reject the upgrade if the JWT is expired', async () => {
      const { userId, sessionId } = await createAuthUser();
      const expiredToken = jwt.sign({ id: userId, sessionId }, JWT_SECRET, { expiresIn: -10 });
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(WS_URL, { headers: { Cookie: `token=${expiredToken}` } });
        ws.on('error', (err: any) => {
          expect(err.message).toContain('401');
          resolve();
        });
        ws.on('open', () => {
          ws.close();
          reject(new Error('Expired JWT should have been rejected.'));
        });
      });
    });

    it('should reject the upgrade if the session was invalidated (no matching Redis session)', async () => {
      const userId = createId();
      const sessionId = createId();
      const profileId = createId();
      
      await prisma.user.create({ data: { id: userId, email: `${userId}@test.com`, password: 'hashed' } });
      await prisma.userProfile.create({
        data: { id: profileId, userId, username: `ws_nosess_${userId.substring(0, 6)}`, avatarUrl: '', location: 'Bengaluru', locationLatitude: 0, locationLongitude: 0, interest: [] }
      });
      
      const token = jwt.sign({ id: userId, sessionId }, JWT_SECRET);

      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(WS_URL, { headers: { Cookie: `token=${token}` } });
        ws.on('error', (err: any) => {
          expect(err.message).toContain('401');
          resolve();
        });
        ws.on('open', () => {
          ws.close();
          reject(new Error('Session-less token should have been rejected.'));
        });
      });
    });

    it('should authenticate valid tokens and map the socket in Redis', async () => {
      const { profileId, token } = await createAuthUser();
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(WS_URL, { headers: { Cookie: `token=${token}` } });
        
        ws.on('open', async () => {
          try {
            const mappedSuccessfully = await waitForRedisState(async () => 
              await serverUserConnectionManager.checkUserStatus(profileId)
            );
            
            expect(mappedSuccessfully).toBe(true);
            const socketCount = await serverUserConnectionManager.countSockets(profileId);
            expect(socketCount).toBeGreaterThan(0);
            
            ws.on('close', () => resolve());
            ws.close();
          } catch(e) {
            ws.close();
            reject(e);
          }
        });
        ws.on('error', reject);
      });
    });
  });

  describe('Message Routing', () => {
    it('should route Redis Pub/Sub messages directly to the targeted WebSocket client', async () => {
      const { profileId, token } = await createAuthUser();
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(WS_URL, { headers: { Cookie: `token=${token}` } });

        ws.on('message', (data) => {
          try {
            const parsed = JSON.parse(data.toString());
            expect(parsed.type).toBe('SYSTEM_EVENT');
            expect(parsed.payload.message).toBe('Hello from Redis!');
            ws.on('close', () => resolve());
            ws.close();
          } catch (e) {
            ws.close();
            reject(e);
          }
        });

        ws.on('open', async () => {
          try {
            await sleep(100);
            const payload = JSON.stringify({
              receiverId: profileId,
              eventType: 'SYSTEM_EVENT',
              eventData: { message: 'Hello from Redis!' }
            });
            await testPubClient.publish('chat_router', payload);
          } catch (err) {
            ws.close();
            reject(err);
          }
        });
        ws.on('error', reject);
      });
    });
  });

  describe('Presence Lifecycle & Disconnects', () => {
    it('should mark the user offline in Redis after a graceful disconnect', async () => {
      const { profileId, token } = await createAuthUser();

      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(WS_URL, { headers: { Cookie: `token=${token}` } });
        ws.on('open', () => { ws.close(); });
        ws.on('close', () => resolve());
        ws.on('error', reject);
      });

      const socketsCleaned = await waitForRedisState(async () => {
        return (await serverUserConnectionManager.countSockets(profileId)) === 0;
      });

      expect(socketsCleaned).toBe(true);
    }, 10000);

    it('should mark the user offline in Redis after an abrupt disconnect (terminate)', async () => {
      const { profileId, token } = await createAuthUser();

      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(WS_URL, { headers: { Cookie: `token=${token}` } });
        ws.on('open', () => { ws.terminate(); });
        ws.on('close', () => resolve());
        ws.on('error', reject);
      });

      const socketsCleaned = await waitForRedisState(async () => {
        return (await serverUserConnectionManager.countSockets(profileId)) === 0;
      });

      expect(socketsCleaned).toBe(true);
    }, 10000);

    it('should track multiple sockets for the same user and only go offline once all close', async () => {
      const { profileId, token } = await createAuthUser();

      const wsA = new WebSocket(WS_URL, { headers: { Cookie: `token=${token}` } });
      const wsB = new WebSocket(WS_URL, { headers: { Cookie: `token=${token}` } });

      await Promise.all([
        new Promise<void>((resolve, reject) => { wsA.on('open', resolve); wsA.on('error', reject); }),
        new Promise<void>((resolve, reject) => { wsB.on('open', resolve); wsB.on('error', reject); }),
      ]);

      await waitForRedisState(async () => (await serverUserConnectionManager.countSockets(profileId)) === 2);

      await new Promise<void>((resolve) => { wsA.on('close', resolve); wsA.close(); });
      
      await waitForRedisState(async () => (await serverUserConnectionManager.countSockets(profileId)) === 1);
      
      await new Promise<void>((resolve) => { wsB.on('close', resolve); wsB.close(); });
      
      const socketsCleaned = await waitForRedisState(async () => (await serverUserConnectionManager.countSockets(profileId)) === 0);
      expect(socketsCleaned).toBe(true); 
    }, 15000);
  });
});