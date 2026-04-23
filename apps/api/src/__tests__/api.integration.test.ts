import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createId } from '@paralleldrive/cuid2';
import jwt from 'jsonwebtoken';
import type { PrismaClient, ConnectionStatus as ConnectionStatusEnum } from '@matcha/prisma';
import type { RedisManager } from '@matcha/redis';

let app: any;
let redisManager: RedisManager;
let prisma: PrismaClient;
let ConnectionStatus: typeof ConnectionStatusEnum;

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

describe('API Integration Tests', () => {
  
  beforeAll(async () => {
    const redisModule = await import('../services/redis.js');
    redisManager = redisModule.redisManager;
    
    const prismaModule = await import('@matcha/prisma');
    prisma = prismaModule.default as unknown as PrismaClient;
    ConnectionStatus = prismaModule.ConnectionStatus;
    
    const express = (await import('express')).default;
    const cookieParser = (await import('cookie-parser')).default;
    const passport = (await import('passport')).default;
    const { configurePassport } = await import('../config/passport.js');
    const mainRouter = (await import('../routes/index.js')).default;
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(passport.initialize());
    configurePassport(passport);
    app.use('/api/v1', mainRouter);
  }, 20000);

  afterAll(async () => {
    if (redisManager) {
      await redisManager.quit();
    }
  });

  async function createAuthUser(withProfile = false) {
    const userId = createId();
    const sessionId = createId();
    let profileId = null;
    await prisma.user.create({
      data: { id: userId, email: `${userId}@test.com`, password: 'hashed_password' }
    });
    if (withProfile) {
      profileId = createId();
      await prisma.userProfile.create({
        data: {
          id: profileId,
          userId: userId,
          username: `user_${userId.substring(0, 8)}`,
          avatarUrl: 'https://example.com/avatar.png',
          location: 'Bengaluru',
          locationLatitude: 12.9716,
          locationLongitude: 77.5946,
          interest: ['coding', 'gaming', 'movies']
        }
      });
    }
    await redisManager.auth.cacheSession(userId, sessionId, 1, profileId, true);
    const token = jwt.sign({ id: userId, sessionId, tokenVersion: 1 }, JWT_SECRET, { expiresIn: '1h' });
    return { userId, profileId, token };
  }

  describe('Guardrails & Authentication', () => {
    it('should reject access to protected routes if the user has no profile', async () => {
      const { token } = await createAuthUser(false);
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Cookie', [`token=${token}`]);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Onboarding incomplete');
      expect(response.body.code).toBe('PROFILE_INCOMPLETE');
    });

    it('should allow access to protected routes if the profile exists', async () => {
      const { token } = await createAuthUser(true);
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Cookie', [`token=${token}`]);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.location).toBe('Bengaluru');
    });
  });

  describe('The Bloom Filter Bridge', () => {
    it('should return available: true instantly from Redis if Bloom filter misses', async () => {
      const { token } = await createAuthUser(true);
      const uniqueName = `new_user_${Date.now()}`;
      const response = await request(app)
        .get(`/api/v1/users/check-username?username=${uniqueName}`)
        .set('Cookie', [`token=${token}`]);
      expect(response.status).toBe(200);
      expect(response.body.available).toBe(true);
    });

    it('should hit Postgres and return available: false if Bloom filter indicates a match', async () => {
      const { token } = await createAuthUser(true);
      const testUsername = 'taken_ninja_99';
      await prisma.userProfile.create({
        data: {
          id: createId(),
          username: testUsername,
          avatarUrl: 'https://example.com/avatar.png',
          location: 'Bengaluru',
          locationLatitude: 12.9716,
          locationLongitude: 77.5946,
          interest: ['coding'],
        }
      });
      await redisManager.bloom.add('bf:usernames', testUsername);
      const response = await request(app)
        .get(`/api/v1/users/check-username?username=${testUsername}`)
        .set('Cookie', [`token=${token}`]);
      expect(response.status).toBe(200);
      expect(response.body.available).toBe(false);
      expect(response.body.message).toBe('Username already taken.');
    });
  });

  describe('Concurrency, Idempotency, and Rate Limiting', () => {
    it('should handle simultaneous identical requests safely', async () => {
      const user1 = await createAuthUser(true);
      const user2 = await createAuthUser(true);
      const connectionId = createId();
      const idempotencyKey = createId();
      await prisma.connection.create({
        data: {
          id: connectionId,
          user1Id: user1.profileId!,
          user2Id: user2.profileId!,
          status: ConnectionStatus.MATCHED,
        }
      });
      const mockExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await redisManager.match.setMatchInfo(connectionId, user1.profileId!, user2.profileId!, mockExpiresAt);
      const requestPromises = Array(5).fill(null).map(() => 
        request(app)
          .patch(`/api/v1/connections/${connectionId}/extend`)
          .set('Cookie', [`token=${user1.token}`])
          .set('x-idempotency-key', idempotencyKey)
      );
      const responses = await Promise.all(requestPromises);
      const statusCodes = responses.map(r => r.status).sort();
      expect(statusCodes.filter(s => s === 200).length).toBe(1); 
      expect(statusCodes.filter(s => s === 409).length).toBe(2); 
      expect(statusCodes.filter(s => s === 429).length).toBe(2); 
      const voteCountKey = `match:votes:${connectionId}:EXTEND`;
      const actualVotes = await redisManager['redis'].hlen(voteCountKey);
      expect(actualVotes).toBe(1); 
    });
  });
});