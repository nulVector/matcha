import { createId } from '@paralleldrive/cuid2';
import { QueueEvents, Queue } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient, ConnectionStatus as ConnectionStatusEnum } from '@matcha/prisma';
import type { RedisManager } from '@matcha/redis';

import type { 
  QueueName as QueueNameEnum, 
  JobName as JobNameEnum,
  CronProducer as CronProducerType
} from '@matcha/queue';

let prisma: PrismaClient;
let ConnectionStatus: typeof ConnectionStatusEnum;
let redisManager: RedisManager;
let dbBufferQueue: Queue;
let cronQueue: Queue;
let QueueName: typeof QueueNameEnum;
let JobName: typeof JobNameEnum;
let CronProducer: typeof CronProducerType;
let startMatchmakingLoop: () => void;
let stopMatchmakingLoop: () => void; 
let queueConnection: any;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Worker Integration Tests', () => {
  let queueEvents: QueueEvents;
  let cronQueueEvents: QueueEvents;
  let testSubscriber: any;

  beforeAll(async () => {
    const prismaModule = await import('@matcha/prisma');
    prisma = prismaModule.default as unknown as PrismaClient;
    ConnectionStatus = prismaModule.ConnectionStatus;
    
    const redisModule = await import('../config/redis.js');
    redisManager = redisModule.redisManager;
    queueConnection = redisModule.workerConnection;
    
    const queuePackage = await import('@matcha/queue');
    dbBufferQueue = queuePackage.dbBufferQueue;
    cronQueue = queuePackage.cronQueue;
    QueueName = queuePackage.QueueName;
    JobName = queuePackage.JobName;
    CronProducer = queuePackage.CronProducer;
    
    const matchConsumer = await import('../consumers/matchConsumer.js');
    startMatchmakingLoop = matchConsumer.startMatchmakingLoop;
    stopMatchmakingLoop = matchConsumer.stopMatchmakingLoop;
    
    await import('../consumers/dbBufferConsumer.js');
    await import('../consumers/cronConsumer.js'); 
    
    queueEvents = new QueueEvents(QueueName.DB_BUFFER, { connection: queueConnection });
    cronQueueEvents = new QueueEvents(QueueName.CRON, { connection: queueConnection }); 
    
    testSubscriber = queueConnection.duplicate();
    await testSubscriber.subscribe('chat_router');
  }, 20000);

  afterAll(async () => {
    stopMatchmakingLoop();
    await queueEvents.close();
    await cronQueueEvents.close();
    await testSubscriber.quit();
    await redisManager.quit();
  });

  describe('The DB Buffer Consumer', () => {
    it('should flush the Redis message buffer into PostgreSQL in a single batch', async () => {
      const connectionId = createId();
      const user1Id = createId();
      const user2Id = createId();
      await prisma.userProfile.createMany({
        data: [
          { id: user1Id, username: 'buffer_u1', avatarUrl: '', location: 'Bengaluru', locationLatitude: 0, locationLongitude: 0 },
          { id: user2Id, username: 'buffer_u2', avatarUrl: '', location: 'Bengaluru', locationLatitude: 0, locationLongitude: 0 }
        ]
      });
      await prisma.connection.create({
        data: { id: connectionId, user1Id, user2Id, status: ConnectionStatus.FRIEND }
      });
      const fakeMessages = Array.from({ length: 50 }).map((_, i) => ({
        id: createId(),
        connectionId,
        content: `Test message ${i}`,
        senderId: user1Id,
        createdAt: new Date().toISOString(),
        type: 'TEXT'
      }));
      const stringifiedMessages = fakeMessages.map(msg => JSON.stringify(msg));
      await redisManager['redis'].rpush('buffer:messages', ...stringifiedMessages);
      const job = await dbBufferQueue.add(JobName.PROCESS_MESSAGE_BATCH, { batchSize: 500 });
      await job.waitUntilFinished(queueEvents);
      const dbMessageCount = await prisma.message.count({
        where: { connectionId }
      });
      const remainingBuffer = await redisManager['redis'].llen('buffer:messages');
      expect(dbMessageCount).toBe(50);
      expect(remainingBuffer).toBe(0);
    });

    it('should flush the Redis read receipt buffer into PostgreSQL', async () => {
      const connectionId = createId();
      const user1Id = createId();
      const user2Id = createId();
      const messageId = createId();
      const readTimestamp = new Date().toISOString();
      await prisma.userProfile.createMany({
        data: [
          { id: user1Id, username: `read_u1_${user1Id.substring(0, 6)}`, avatarUrl: '', location: 'Bengaluru', locationLatitude: 0, locationLongitude: 0 },
          { id: user2Id, username: `read_u2_${user2Id.substring(0, 6)}`, avatarUrl: '', location: 'Bengaluru', locationLatitude: 0, locationLongitude: 0 }
        ]
      });
      await prisma.connection.create({
        data: { id: connectionId, user1Id, user2Id, status: ConnectionStatus.FRIEND } 
      });
      await prisma.message.create({
        data: {
          id: messageId,
          connectionId: connectionId,
          senderId: user1Id,
          content: 'Test message for read receipt',
          type: 'TEXT'
        }
      });
      const payload = JSON.stringify({
        messageId: messageId,
        readAt: readTimestamp
      });
      await redisManager['redis'].hset('buffer:reads', `${connectionId}:${user2Id}`, payload);
      const job = await dbBufferQueue.add(JobName.PROCESS_READ_BATCH, {});
      await job.waitUntilFinished(queueEvents);
      const state = await job.getState();
      expect(state).toBe('completed');
      const updatedConnection = await prisma.connection.findUnique({
        where: { id: connectionId }
      });
      expect(updatedConnection?.user2LastReadId).toBe(messageId);
      expect(updatedConnection?.user2LastReadAt?.toISOString()).toBe(new Date(readTimestamp).toISOString());
      const remainingBuffer = await redisManager['redis'].exists('buffer:reads');
      expect(remainingBuffer).toBe(0); 
    });
  });

  describe('The Matchmaking Lifecycle Loop', () => {
    it('should pair two users via HNSW vector search, lock them, and write to Postgres', async () => {
      interface MatchEvent {
        eventType: string;
        eventData: { connectionId: string; [key: string]: any };
      }
      const searcherId = createId();
      const candidateId = createId();
      const pubSubEvents: MatchEvent[] = [];

      testSubscriber.on('message', (channel: string, message: string) => {
        if (channel === 'chat_router') {
          pubSubEvents.push(JSON.parse(message));
        }
      });

      await prisma.userProfile.createMany({
        data: [
          { id: searcherId, username: 'searcher_bot', avatarUrl: '', location: 'Bengaluru', locationLatitude: 12.97, locationLongitude: 77.59, interest: ['coding'] },
          { id: candidateId, username: 'candidate_bot', avatarUrl: '', location: 'Bengaluru', locationLatitude: 12.97, locationLongitude: 77.59, interest: ['coding'] }
        ]
      });
      await redisManager.userDetail.cacheProfile(searcherId, {
        locationLatitude: 12.97,
        locationLongitude: 77.59
      });
      await redisManager.userDetail.cacheProfile(candidateId, {
        locationLatitude: 12.97,
        locationLongitude: 77.59
      });
      await redisManager.match.updateMatchProfile(searcherId, 12.97, 77.59, ['coding']);
      await redisManager.match.updateMatchProfile(candidateId, 12.97, 77.59, ['coding']);
      await redisManager.match.addToQueue(searcherId);
      await redisManager.match.addToQueue(candidateId);
      await redisManager.userConnection.setUserStatus(searcherId);
      await redisManager.userConnection.setUserStatus(candidateId);
      
      await sleep(500);
      startMatchmakingLoop();
      await sleep(4000);
      stopMatchmakingLoop();
      
      const searcherStatus = await redisManager['redis'].hget(`user:profile:${searcherId}`, 'queueStatus');
      const queueLength = await redisManager['redis'].llen('match:queue');
      expect(searcherStatus).toBe('MATCHED');
      expect(queueLength).toBe(0);
      const newConnection = await prisma.connection.findFirst({
        where: {
          OR: [
            { user1Id: searcherId, user2Id: candidateId },
            { user1Id: candidateId, user2Id: searcherId }
          ]
        }
      });
      expect(newConnection).toBeDefined();
      expect(newConnection?.status).toBe(ConnectionStatus.MATCHED);
      const matchFoundEvents = pubSubEvents.filter(e => e.eventType === 'MATCH_FOUND');
      expect(matchFoundEvents.length).toBe(2); 
      expect(matchFoundEvents[0]!.eventData.connectionId).toBe(newConnection?.id);
    });
  });

  describe('The Cron Job Consumers', () => {

    it('should successfully execute the match queue sweep', async () => {
      const job = await CronProducer.forceSweepNow();
      await job.waitUntilFinished(cronQueueEvents); 
      
      const state = await job.getState();
      expect(state).toBe('completed');
    });

    it('should successfully execute the archive chats cleanup', async () => {
      const job = await CronProducer.forceCleanupNow();
      await job.waitUntilFinished(cronQueueEvents);
      const state = await job.getState();
      expect(state).toBe('completed');
    });

    it('should successfully execute the expired matches archive', async () => {
      const job = await CronProducer.forceArchiveExpiredNow();
      await job.waitUntilFinished(cronQueueEvents);
      const state = await job.getState();
      expect(state).toBe('completed');
    });
  });
});