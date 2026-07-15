import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createId } from '@paralleldrive/cuid2';
import jwt from 'jsonwebtoken';
import type { PrismaClient, ConnectionStatus as ConnectionStatusEnum } from '@matcha/prisma';
import type { AuthManager, BloomFilterManager, MatchManager, RedisClient } from '@matcha/redis';
import { getDeterministicIds } from '@matcha/shared';
import type { Express, Router } from 'express';

let app: Express;
let authManager: AuthManager;
let bloomManager: BloomFilterManager;
let matchManager: MatchManager;
let matchClient: RedisClient;
let closeRedisConnections: () => Promise<void>;
let prisma: PrismaClient;
let ConnectionStatus: typeof ConnectionStatusEnum;

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

describe('API Integration Tests', () => {
  
  beforeAll(async () => {
    const redisModule = await import('../services/redis.js');
    authManager = redisModule.authManager;
    bloomManager = redisModule.bloomManager;
    matchManager = redisModule.matchManager;
    matchClient = redisModule.matchClient;
    closeRedisConnections = redisModule.closeRedisConnections;
    
    const prismaModule = await import('@matcha/prisma');
    prisma = prismaModule.default as unknown as PrismaClient;
    ConnectionStatus = prismaModule.ConnectionStatus;
    
    const express = (await import('express')).default;
    const cookieParser = (await import('cookie-parser')).default;
    const passport = (await import('passport')).default;
    const { configurePassport } = await import('../config/passport.js');
    const mainRouter = (await import('../routes/index.js')).default as unknown as Router;
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(passport.initialize());
    configurePassport(passport);
    app.use('/api/v1', mainRouter);
  }, 20000);

  afterAll(async () => {
    if (closeRedisConnections) {
      await closeRedisConnections();
    }
  });
  async function createAuthUser(opts: { allowDiscovery?: boolean; isActive?: boolean; withProfile?: boolean } = {}) {
    const userId = createId();
    const sessionId = createId();
    let profileId = null;
    await prisma.user.create({
      data: { id: userId, email: `${userId}@test.com`, password: 'hashed_password' }
    });

    if (opts.withProfile !== false) {
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
          interest: ['coding', 'gaming', 'movies'],
          allowDiscovery: opts.allowDiscovery ?? true,
          isActive: opts.isActive ?? true,
        },
      });
    }
    await authManager.cacheSession(userId, sessionId, profileId, true);
    const token = jwt.sign({ id: userId, sessionId}, JWT_SECRET, { expiresIn: '1h' });
    return { userId, profileId, token };
  }

  function sendRequest(token: string, targetUserId: string, body: object, idempotencyKey = createId()) {
    return request(app)
      .post(`/api/v1/users/${targetUserId}/request`)
      .set('Cookie', [`token=${token}`])
      .set('x-idempotency-key', idempotencyKey)
      .send(body);
  }

  describe('Guardrails & Authentication', () => {
    it('should reject access to protected routes if the user has no profile', async () => {
      const { token } = await createAuthUser({ withProfile: false });
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Cookie', [`token=${token}`]);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Onboarding incomplete');
      expect(response.body.code).toBe('PROFILE_INCOMPLETE');
    });

    it('should allow access to protected routes if the profile exists', async () => {
      const { token } = await createAuthUser();
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
      const { token } = await createAuthUser();
      const uniqueName = `new_user_${Date.now()}`;
      const response = await request(app)
        .get(`/api/v1/users/check-username?username=${uniqueName}`)
        .set('Cookie', [`token=${token}`]);
      expect(response.status).toBe(200);
      expect(response.body.available).toBe(true);
    });

    it('should hit Postgres and return available: false if Bloom filter indicates a match', async () => {
      const { token } = await createAuthUser();
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
      await bloomManager.add('bf:usernames', testUsername);
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
      const user1 = await createAuthUser();
      const user2 = await createAuthUser();
      const [u1, u2] = getDeterministicIds(user1.profileId!, user2.profileId!);
      const connectionId = createId();
      const idempotencyKey = createId();
      await prisma.connection.create({
        data: {
          id: connectionId,
          user1Id: u1,
          user2Id: u2,
          status: ConnectionStatus.MATCHED,
        }
      });
      const mockExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await matchManager.setMatchInfo(connectionId, user1.profileId!, user2.profileId!, mockExpiresAt);
      const requestPromises = Array(5).fill(null).map(() => 
        request(app)
          .patch(`/api/v1/connections/${connectionId}/extend`)
          .set('Cookie', [`token=${user1.token}`])
          .set('x-idempotency-key', idempotencyKey)
          .send({ action: 'ACCEPT' })
      );
      const responses = await Promise.all(requestPromises);
      const statusCodes = responses.map(r => r.status).sort();
      expect(statusCodes.filter(s => s === 200).length).toBe(1); 
      expect(statusCodes.filter(s => s === 409).length).toBe(2); 
      expect(statusCodes.filter(s => s === 429).length).toBe(2); 
      const voteCountKey = `match:votes:${connectionId}:EXTEND`;
      const actualVotes = await matchClient.hlen(voteCountKey);
      expect(actualVotes).toBe(1); 
    });
  });

  describe('Friend Request Business Rules', () => {
    it('should reject a self-request', async () => {
        const { token, profileId } = await createAuthUser();
        const res = await sendRequest(token, profileId!, { origin: 'SEARCH' });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Self-requests are not allowed');
      });
    
      it('should 404 if the target user does not exist / is not discoverable', async () => {
        const { token } = await createAuthUser();
        const { profileId: hiddenTarget } = await createAuthUser({ allowDiscovery: false });
        const res = await sendRequest(token, hiddenTarget!, { origin: 'SEARCH' });
        expect(res.status).toBe(404);
      });
    
      it('should create a PENDING FriendRequest on a fresh SEARCH-origin request', async () => {
        const { token, profileId: senderId } = await createAuthUser();
        const { profileId: receiverId } = await createAuthUser();
    
        const res = await sendRequest(token, receiverId!, { origin: 'SEARCH' });
        expect(res.status).toBe(201);
    
        const created = await prisma.friendRequest.findFirst({
          where: { senderId: senderId!, receiverId: receiverId! },
        });
        expect(created).not.toBeNull();
        expect(created?.status).toBe('PENDING');
        expect(created?.origin).toBe('SEARCH');
      });
    
      it('should reject a second request while one is still PENDING in either direction', async () => {
        const { token: senderToken, profileId: senderId } = await createAuthUser();
        const { token: receiverToken, profileId: receiverId } = await createAuthUser();
    
        const first = await sendRequest(senderToken, receiverId!, { origin: 'SEARCH' });
        expect(first.status).toBe(201);
    
        const secondFromSender = await sendRequest(senderToken, receiverId!, { origin: 'SEARCH' });
        expect(secondFromSender.status).toBe(400);
        expect(secondFromSender.body.message).toBe('Request already pending');
    
        const reverseFromReceiver = await sendRequest(receiverToken, senderId!, { origin: 'SEARCH' });
        expect(reverseFromReceiver.status).toBe(400);
        expect(reverseFromReceiver.body.message).toBe('This user has already sent you a request! Check your inbox.');
      });
    
      it('should reject a request if the pair is already FRIEND', async () => {
        const { token, profileId: senderId } = await createAuthUser();
        const { profileId: receiverId } = await createAuthUser();
        const [user1Id, user2Id] = getDeterministicIds(senderId!, receiverId!);
        await prisma.connection.create({
          data: { user1Id, user2Id, status: ConnectionStatus.FRIEND },
        });
    
        const res = await sendRequest(token, receiverId!, { origin: 'SEARCH' });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('You are already friends with this user');
      });
    
      it('should allow a brand-new request immediately after a prior request between the same pair was rejected', async () => {
        const { token: senderToken, profileId: senderId } = await createAuthUser();
        const { token: receiverToken, profileId: receiverId } = await createAuthUser();
    
        const first = await sendRequest(senderToken, receiverId!, { origin: 'SEARCH' });
        expect(first.status).toBe(201);
    
        const pending = await prisma.friendRequest.findFirst({ where: { senderId: senderId!, receiverId: receiverId! } });
        expect(pending).not.toBeNull();
    
        const rejectRes = await request(app)
          .post(`/api/v1/users/${pending!.id}/handle-request`)
          .set('Cookie', [`token=${receiverToken}`])
          .set('x-idempotency-key', createId())
          .send({ action: 'REJECT' });
        expect(rejectRes.status).toBe(200);
    
        const afterReject = await prisma.friendRequest.findUnique({ where: { id: pending!.id } });
        expect(afterReject).toBeNull();
    
        const second = await sendRequest(senderToken, receiverId!, { origin: 'SEARCH' });
        expect(second.status).toBe(201);
      });
    
      it('accepting a SEARCH-origin request should create a new FRIEND Connection', async () => {
        const { token: senderToken, profileId: senderId } = await createAuthUser();
        const { token: receiverToken, profileId: receiverId } = await createAuthUser();
    
        await sendRequest(senderToken, receiverId!, { origin: 'SEARCH' });
        const pending = await prisma.friendRequest.findFirst({ where: { senderId: senderId!, receiverId: receiverId! } });
    
        const acceptRes = await request(app)
          .post(`/api/v1/users/${pending!.id}/handle-request`)
          .set('Cookie', [`token=${receiverToken}`])
          .set('x-idempotency-key', createId())
          .send({ action: 'ACCEPT' });
        expect(acceptRes.status).toBe(200);
    
        const [user1Id, user2Id] = getDeterministicIds(senderId!, receiverId!);
        const connection = await prisma.connection.findUnique({
          where: { user1Id_user2Id: { user1Id, user2Id } },
        });
        expect(connection).not.toBeNull();
        expect(connection?.status).toBe(ConnectionStatus.FRIEND);
    
        const requestRow = await prisma.friendRequest.findUnique({ where: { id: pending!.id } });
        expect(requestRow).toBeNull();
      });
    
      it('accepting an ARCHIVE-origin request should revive the existing archived Connection instead of creating a new one', async () => {
        const { token: senderToken, profileId: senderId } = await createAuthUser();
        const { token: receiverToken, profileId: receiverId } = await createAuthUser();
        const [user1Id, user2Id] = getDeterministicIds(senderId!, receiverId!);
    
        const archivedConnection = await prisma.connection.create({
          data: {
            user1Id, user2Id,
            status: ConnectionStatus.ARCHIVED,
            finalDeleteAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            user1ChatVisible: false,
            user2ChatVisible: false,
          },
        });
    
        const sendRes = await sendRequest(senderToken, receiverId!, {
          origin: 'ARCHIVE',
          connectionId: archivedConnection.id,
        });
        expect(sendRes.status).toBe(201);
    
        const pending = await prisma.friendRequest.findFirst({ where: { senderId: senderId!, receiverId: receiverId! } });
        expect(pending?.origin).toBe('ARCHIVE');
        expect(pending?.connectionId).toBe(archivedConnection.id);
    
        const acceptRes = await request(app)
          .post(`/api/v1/users/${pending!.id}/handle-request`)
          .set('Cookie', [`token=${receiverToken}`])
          .set('x-idempotency-key', createId())
          .send({ action: 'ACCEPT' });
        expect(acceptRes.status).toBe(200);
    
        const revived = await prisma.connection.findUnique({ where: { id: archivedConnection.id } });
        expect(revived?.status).toBe(ConnectionStatus.FRIEND);
        expect(revived?.finalDeleteAt).toBeNull();
        expect(revived?.user1ChatVisible).toBe(true);
        expect(revived?.user2ChatVisible).toBe(true);
    
        const allConnectionsForPair = await prisma.connection.findMany({
          where: { user1Id, user2Id },
        });
        expect(allConnectionsForPair.length).toBe(1);
      });
    
      it('should reject ARCHIVE origin without a connectionId at the validation layer', async () => {
        const { token } = await createAuthUser();
        const { profileId: receiverId } = await createAuthUser();
        const res = await sendRequest(token, receiverId!, { origin: 'ARCHIVE' });
        expect(res.status).toBe(400);
      });
    
      it('cancelRequest should only allow the original sender to cancel their own PENDING request', async () => {
        const { token: senderToken, profileId: senderId } = await createAuthUser();
        const { token: receiverToken, profileId: receiverId } = await createAuthUser();
    
        await sendRequest(senderToken, receiverId!, { origin: 'SEARCH' });
        const pending = await prisma.friendRequest.findFirst({ where: { senderId: senderId!, receiverId: receiverId! } });
    
        const wrongCancel = await request(app)
          .delete(`/api/v1/users/${pending!.id}/cancel`)
          .set('Cookie', [`token=${receiverToken}`])
          .set('x-idempotency-key', createId());
        expect(wrongCancel.status).toBe(404);
    
        const rightCancel = await request(app)
          .delete(`/api/v1/users/${pending!.id}/cancel`)
          .set('Cookie', [`token=${senderToken}`])
          .set('x-idempotency-key', createId());
        expect(rightCancel.status).toBe(200);
    
        const afterCancel = await prisma.friendRequest.findUnique({ where: { id: pending!.id } });
        expect(afterCancel).toBeNull();
      });
    
      it('handleRequest should 404 if the request does not belong to the requesting user as receiver', async () => {
        const { token: senderToken, profileId: senderId } = await createAuthUser();
        const { profileId: receiverId } = await createAuthUser();
        const { token: strangerToken } = await createAuthUser();
    
        await sendRequest(senderToken, receiverId!, { origin: 'SEARCH' });
        const pending = await prisma.friendRequest.findFirst({ where: { senderId: senderId!, receiverId: receiverId! } });
    
        const res = await request(app)
          .post(`/api/v1/users/${pending!.id}/handle-request`)
          .set('Cookie', [`token=${strangerToken}`])
          .set('x-idempotency-key', createId())
          .send({ action: 'ACCEPT' });
        expect(res.status).toBe(404);
      });
    
      it('should return 401 for the request endpoint without a valid auth token', async () => {
        const { profileId: receiverId } = await createAuthUser();
        const res = await request(app)
          .post(`/api/v1/users/${receiverId}/request`)
          .set('x-idempotency-key', createId())
          .send({ origin: 'SEARCH' });
        expect(res.status).toBe(401);
      });
    
      it('should reject a repeated request within the idempotency window using the same key', async () => {
        const { token, profileId: senderId } = await createAuthUser();
        const { profileId: receiverId } = await createAuthUser();
        const idempotencyKey = createId();
    
        const first = await sendRequest(token, receiverId!, { origin: 'SEARCH' }, idempotencyKey);
        expect(first.status).toBe(201);
    
        const replay = await sendRequest(token, receiverId!, { origin: 'SEARCH' }, idempotencyKey);
        expect(replay.status).toBe(409);
    
        const rows = await prisma.friendRequest.findMany({ where: { senderId: senderId!, receiverId: receiverId! } });
        expect(rows.length).toBe(1);
      });
  });
});