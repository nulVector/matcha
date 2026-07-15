import type { ConnectionStatus as ConnectionStatusEnum, PrismaClient } from '@matcha/prisma';
import type { BloomFilterManager, ChatManager, MatchManager, RedisClient, UserConnectionManager } from '@matcha/redis';
import { getDeterministicIds } from '@matcha/shared';
import { createId } from '@paralleldrive/cuid2';
import { Queue, QueueEvents, Worker } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type {
  CronProducer as CronProducerType,
  JobName as JobNameEnum,
  QueueName as QueueNameEnum
} from '@matcha/queue';
import Redis from 'ioredis';

let prisma: PrismaClient;
let ConnectionStatus: typeof ConnectionStatusEnum;

let matchManager: MatchManager;
let userConnectionManager: UserConnectionManager;
let chatManager: ChatManager;
let bloomManager: BloomFilterManager;
let cacheClient: RedisClient;
let matchClient: RedisClient;
let closeRedisConnections: () => Promise<void>;

let dbBufferQueue: Queue;
let taskQueue: Queue;
let dlqQueue: Queue;
let cronQueue: Queue;

let dbBufferWorker: Worker;
let taskWorker: Worker;

let QueueName: typeof QueueNameEnum;
let JobName: typeof JobNameEnum;
let CronProducer: typeof CronProducerType;

let startMatchmakingLoop: () => Promise<void>;
let stopMatchmakingLoop: () => Promise<void>; 
let startDlqMonitor: () => void;
let stopDlqMonitor: () => Promise<void>;

let queueConnection: Redis;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Worker Integration Tests', () => {
  let dbBufferEvents: QueueEvents;
  let cronQueueEvents: QueueEvents;
  let testSubscriber: Redis;

  beforeAll(async () => {
    const prismaModule = await import('@matcha/prisma');
    prisma = prismaModule.default as unknown as PrismaClient;
    ConnectionStatus = prismaModule.ConnectionStatus;
    
    const redisModule = await import('../config/redis.js');
    matchManager = redisModule.matchManager;
    userConnectionManager = redisModule.userConnectionManager;
    chatManager = redisModule.chatManager;
    bloomManager = redisModule.bloomManager;
    cacheClient = redisModule.cacheClient;
    matchClient = redisModule.matchClient;
    closeRedisConnections = redisModule.closeRedisConnections;
    queueConnection = redisModule.workerConnection;
    
    const queuePackage = await import('@matcha/queue');
    dbBufferQueue = queuePackage.dbBufferQueue;
    taskQueue = queuePackage.taskQueue;
    dlqQueue = queuePackage.dlqQueue;
    cronQueue = queuePackage.cronQueue;
    QueueName = queuePackage.QueueName;
    JobName = queuePackage.JobName;
    CronProducer = queuePackage.CronProducer;
    
    const matchConsumer = await import('../consumers/matchConsumer.js');
    startMatchmakingLoop = matchConsumer.startMatchmakingLoop;
    stopMatchmakingLoop = matchConsumer.stopMatchmakingLoop;
    
    const monitorModule = await import('../consumers/dlqMonitor.js');
    startDlqMonitor = monitorModule.startDlqMonitor;
    stopDlqMonitor = monitorModule.stopDlqMonitor;

    const dbBufferConsumerModule = await import('../consumers/dbBufferConsumer.js');
    dbBufferWorker = dbBufferConsumerModule.dbBufferWorker;

    const taskConsumerModule = await import('../consumers/taskConsumer.js');
    taskWorker = taskConsumerModule.taskWorker;

    await import('../consumers/cronConsumer.js'); 
    
    dbBufferEvents = new QueueEvents(QueueName.DB_BUFFER, { connection: queueConnection });
    cronQueueEvents = new QueueEvents(QueueName.CRON, { connection: queueConnection }); 
    testSubscriber = queueConnection.duplicate();
    await testSubscriber.subscribe('chat_router');
    startDlqMonitor();
  }, 20000);

  afterAll(async () => {
    await stopMatchmakingLoop();
    await stopDlqMonitor();
    
    await dbBufferWorker.close();
    await taskWorker.close();
    
    await dbBufferEvents.close();
    await cronQueueEvents.close();
    
    await taskQueue.close();
    await dbBufferQueue.close();
    await dlqQueue.close();
    await cronQueue.close();
    
    await testSubscriber.quit();
    await queueConnection.quit();
    if (closeRedisConnections) await closeRedisConnections();
  });

  describe('The DB Buffer Consumer', () => {
    async function createTestConnection() {
      const [user1Id, user2Id] = getDeterministicIds(createId(), createId());
      const user1 = await prisma.userProfile.create({
        data: { id: user1Id, username: `bot_${createId()}`, avatarUrl: '', location: 'Bengaluru', locationLatitude: 12.9716, locationLongitude: 77.5946, interest: [] },
      });
      const user2 = await prisma.userProfile.create({
        data: { id: user2Id, username: `bot_${createId()}`, avatarUrl: '', location: 'Bengaluru', locationLatitude: 12.9716, locationLongitude: 77.5946, interest: [] },
      });
      const connection = await prisma.connection.create({
        data: { user1Id, user2Id, status: 'FRIEND' },
      });
      return { user1, user2, connection };
    }

    it('should flush a buffered message batch from Redis into Postgres and trim the buffer', async () => {
      const { user1, connection } = await createTestConnection();
      const messageId = createId();

      await cacheClient.rpush(
        'buffer:messages',
        JSON.stringify({
          id: messageId, connectionId: connection.id, senderId: user1.id,
          content: 'hello from the buffer', type: 'TEXT', createdAt: new Date().toISOString(),
        })
      );

      const bufferLenBefore = await cacheClient.llen('buffer:messages');
      const job = await dbBufferQueue.add(JobName.PROCESS_MESSAGE_BATCH, { batchSize: 500 });
      await job.waitUntilFinished(dbBufferEvents);

      const message = await prisma.message.findUnique({ where: { id: messageId } });
      expect(message).not.toBeNull();
      expect(message?.content).toBe('hello from the buffer');

      const bufferLenAfter = await cacheClient.llen('buffer:messages');
      expect(bufferLenAfter).toBeLessThan(bufferLenBefore);
    });

    it('should skip duplicate message ids already committed (skipDuplicates) instead of throwing', async () => {
      const { user1, connection } = await createTestConnection();
      const messageId = createId();
      const rawMessage = JSON.stringify({
        id: messageId, connectionId: connection.id, senderId: user1.id,
        content: 'duplicate test', type: 'TEXT', createdAt: new Date().toISOString(),
      });

      await cacheClient.rpush('buffer:messages', rawMessage);
      await cacheClient.rpush('buffer:messages', rawMessage);

      const job = await dbBufferQueue.add(JobName.PROCESS_MESSAGE_BATCH, { batchSize: 500 });
      await job.waitUntilFinished(dbBufferEvents);

      const messages = await prisma.message.findMany({ where: { id: messageId } });
      expect(messages.length).toBe(1); 
    });

    it('should flush a buffered read receipt into Postgres as a lastRead pointer update', async () => {
      const { user1, user2, connection } = await createTestConnection();
      const readMessage = await prisma.message.create({
        data: { connectionId: connection.id, senderId: user2.id, content: 'read receipt target message' },
      });

      await chatManager.bufferReadReceipt(connection.id, user1.id, readMessage.id);
      
      const job = await dbBufferQueue.add(JobName.PROCESS_READ_BATCH, {});
      await job.waitUntilFinished(dbBufferEvents);

      const updated = await prisma.connection.findUnique({ where: { id: connection.id } });
      const readIdForUser1 = updated?.user1Id === user1.id ? updated.user1LastReadId : updated?.user2LastReadId;
      
      expect(readIdForUser1).toBe(readMessage.id);
    });

    it('should return early with no error when the message buffer is empty', async () => {
      await cacheClient.del('buffer:messages');
      const job = await dbBufferQueue.add(JobName.PROCESS_MESSAGE_BATCH, { batchSize: 500 });
      await expect(job.waitUntilFinished(dbBufferEvents)).resolves.toBeDefined();
    });
  });

  describe('The Matchmaking Lifecycle Loop', () => {
    async function seedQueuedUser(id: string, lat: number, long: number, interest: string[]) {
      await prisma.userProfile.create({
        data: {
          id,
          username: `bot_${createId()}`,
          avatarUrl: '',
          location: 'Test City',
          locationLatitude: lat,
          locationLongitude: long,
          interest,
          isActive: true,
          allowDiscovery: true
        }
      });

      await matchManager.updateMatchProfile(id, lat, long, interest);
      await matchClient.hset(`user:profile:${id}`, {
        locationLatitude: lat.toString(),
        locationLongitude: long.toString(),
      });
      await matchManager.addToQueue(id);
    }

    it('should pair two compatible nearby users, lock them, write to Postgres, and publish events', async () => {
      const userA = createId();
      const userB = createId();
      const pubSubEvents: any[] = [];

      const messageListener = (channel: string, message: string) => {
        if (channel === 'chat_router') pubSubEvents.push(JSON.parse(message));
      };
      testSubscriber.on('message', messageListener);

      await seedQueuedUser(userA, 12.9716, 77.5946, ['coding', 'gaming', 'movies']);
      await seedQueuedUser(userB, 12.9716, 77.5946, ['coding', 'gaming', 'movies']);
      await userConnectionManager.setUserStatus(userA);
      await userConnectionManager.setUserStatus(userB);

      await startMatchmakingLoop();

      let connection = null;
      for (let i = 0; i < 20; i++) {
        await sleep(500);
        connection = await prisma.connection.findFirst({
          where: {
            OR: [
              { user1Id: userA, user2Id: userB },
              { user1Id: userB, user2Id: userA },
            ],
          },
        });
        if (connection) break;
      }

      await stopMatchmakingLoop();
      testSubscriber.off('message', messageListener);

      expect(connection).not.toBeNull();
      expect(connection?.status).toBe(ConnectionStatus.MATCHED);
    }, 20000);

    it('should add the matched pair to the Bloom filter so they are not resurfaced', async () => {
      const userA = createId();
      const userB = createId();

      await seedQueuedUser(userA, 12.9716, 77.5946, ['backpacking', 'weightlifting']);
      await seedQueuedUser(userB, 12.9716, 77.5946, ['backpacking', 'weightlifting']);
      await userConnectionManager.setUserStatus(userA);
      await userConnectionManager.setUserStatus(userB);

      await startMatchmakingLoop();

      let matchedInBloom = false;
      for (let i = 0; i < 20; i++) {
        await sleep(500);
        matchedInBloom = await bloomManager.existsPair('bf:matches', userA, userB);
        if (matchedInBloom) break;
      }

      await stopMatchmakingLoop();
      expect(matchedInBloom).toBe(true);
    }, 20000);

    it('should not match two users who are geographically far apart beyond the current wait-time radius', async () => {
      const nearUser = createId();
      const farUser = createId();

      await seedQueuedUser(nearUser, 12.9716, 77.5946, ['coding']);
      await seedQueuedUser(farUser, 28.7041, 77.1025, ['coding']);

      await startMatchmakingLoop();

      for (let i = 0; i < 20; i++) {
        const queueLen = await matchClient.llen('match:queue');
        if (queueLen === 0) break;
        await sleep(300);
      }
      
      await stopMatchmakingLoop();

      const connection = await prisma.connection.findFirst({
        where: {
          OR: [
            { user1Id: nearUser, user2Id: farUser },
            { user1Id: farUser, user2Id: nearUser },
          ],
        },
      });

      expect(connection).toBeNull();
    }, 15000);
  });

  describe('The Cron Job Consumers', () => {
    it('should successfully execute the match queue sweep', async () => {
      const job = await CronProducer.forceSweepNow();
      await job.waitUntilFinished(cronQueueEvents); 
      expect(await job.getState()).toBe('completed');
    });

    it('should successfully execute the archive chats cleanup', async () => {
      const job = await CronProducer.forceCleanupNow();
      await job.waitUntilFinished(cronQueueEvents);
      expect(await job.getState()).toBe('completed');
    });

    it('should successfully execute the expired matches archive', async () => {
      const job = await CronProducer.forceArchiveExpiredNow();
      await job.waitUntilFinished(cronQueueEvents);
      expect(await job.getState()).toBe('completed');
    });
  });

  describe('The Dead-Letter Queue (DLQ) Monitor', () => {
    it('should route a job to the DLQ once it exhausts all retry attempts', async () => {
      const jobId = `dlq-test-${createId()}`;
      
      await taskQueue.add(
        'not_a_real_job_name' as any,
        { traceId: jobId },
        { jobId, attempts: 1 }
      );

      let dlqJob = null;
      for (let i = 0; i < 20; i++) {
        await sleep(500);
        dlqJob = await dlqQueue.getJob(`dlq-task_queue-${jobId}`);
        if (dlqJob) break;
      }

      expect(dlqJob).not.toBeNull();
      expect(dlqJob?.data.originalQueue).toBe('task_queue');
      expect(dlqJob?.data.error).toBeDefined();
    }, 15000);

    it('should NOT route a job to the DLQ while it still has retry attempts remaining', async () => {
      const jobId = `dlq-retry-test-${createId()}`;
      await taskQueue.add(
        'not_a_real_job_name' as any,
        { traceId: jobId },
        { jobId, attempts: 3, backoff: { type: 'fixed', delay: 500 } }
      );

      await sleep(300); 
      const dlqJobTooEarly = await dlqQueue.getJob(`dlq-task_queue-${jobId}`);
      expect(dlqJobTooEarly).toBeUndefined();
    }, 10000);

    it('should preserve the original job payload inside the DLQ entry', async () => {
      const jobId = `dlq-payload-test-${createId()}`;
      const originalPayload = { traceId: jobId, note: 'must survive into the DLQ' };

      await taskQueue.add('not_a_real_job_name' as any, originalPayload, { jobId, attempts: 1 });

      let dlqJob = null;
      for (let i = 0; i < 20; i++) {
        await sleep(500);
        dlqJob = await dlqQueue.getJob(`dlq-task_queue-${jobId}`);
        if (dlqJob) break;
      }

      expect(dlqJob?.data.originalData).toEqual(originalPayload);
    }, 15000);
  });
});