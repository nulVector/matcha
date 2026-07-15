import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Queue } from 'bullmq';
import type { TaskProducer as TaskProducerType, DbBufferProducer as DbBufferProducerType, CronProducer as CronProducerType } from '@matcha/queue';
import type { JobName as JobNameEnum, QueueName as QueueNameEnum } from '@matcha/queue';

let taskQueue: Queue;
let dbBufferQueue: Queue;
let cronQueue: Queue;
let TaskProducer: typeof TaskProducerType;
let DbBufferProducer: typeof DbBufferProducerType;
let CronProducer: typeof CronProducerType;
let queueConnection: any;

let JobName: typeof JobNameEnum;
let QueueName: typeof QueueNameEnum;

describe('Queue producers', () => {
  beforeAll(async () => {
    const queueModule = await import('../index.js');
    taskQueue = queueModule.taskQueue;
    dbBufferQueue = queueModule.dbBufferQueue;
    cronQueue = queueModule.cronQueue;
    TaskProducer = queueModule.TaskProducer;
    DbBufferProducer = queueModule.DbBufferProducer;
    CronProducer = queueModule.CronProducer;
    queueConnection = queueModule.queueConnection;
    JobName = queueModule.JobName;
    QueueName = queueModule.QueueName;
  });

  afterAll(async () => {
    await taskQueue.close();
    await dbBufferQueue.close();
    await cronQueue.close();
    await queueConnection.quit();
  });

  describe('TaskProducer', () => {
    it('dispatchProfileInit should add a PROFILE_INIT job to the task queue with the given payload', async () => {
      const payload = {
        userId: 'user_profile_init_1',
        username: 'profile_init_user',
        locationLatitude: 12.9716,
        locationLongitude: 77.5946,
        interest: ['coding', 'gaming'],
      };
      const job = await TaskProducer.dispatchProfileInit(payload as any);
      expect(job.name).toBe(JobName.PROFILE_INIT);
      expect(job.data).toEqual(payload);
      expect(job.queueName).toBe(QueueName.TASK);
    });

    it('dispatchSendEmail should add a SEND_EMAIL job to the task queue', async () => {
      const payload = {
        to: 'test@example.com',
        subject: 'Password Reset',
        template: 'PASSWORD_RESET',
        context: { resetUrl: 'https://trymatcha.in/reset/abc', expiresIn: '15 minutes' },
      };
      const job = await TaskProducer.dispatchSendEmail(payload as any);
      expect(job.name).toBe(JobName.SEND_EMAIL);
      expect(job.data.to).toBe('test@example.com');
    });

    it('dispatchHandleDroppedMatch should apply a 15s grace-period delay and a deterministic jobId', async () => {
      const payload = {
        userId: 'user_dropped_1',
        connectionId: 'connection_dropped_1',
        partnerId: 'partner_dropped_1',
      };
      const job = await TaskProducer.dispatchHandleDroppedMatch(payload as any);
      expect(job.name).toBe(JobName.HANDLE_DROPPED_MATCH);
      expect(job.opts.delay).toBe(15000);
      expect(job.id).toBe(`grace-period-${payload.userId}-${payload.connectionId}`);
    });

    it('dispatchHandleDroppedMatch should be idempotent per (userId, connectionId) via the deterministic jobId', async () => {
      const payload = {
        userId: 'user_dropped_dup',
        connectionId: 'connection_dropped_dup',
        partnerId: 'partner_dropped_dup',
      };
      const first = await TaskProducer.dispatchHandleDroppedMatch(payload as any);
      const second = await TaskProducer.dispatchHandleDroppedMatch(payload as any);
      expect(first.id).toBe(second.id);
    });
  });

  describe('DbBufferProducer', () => {
    it('initializeSchedules should register repeatable jobs for PROCESS_MESSAGE_BATCH and PROCESS_READ_BATCH', async () => {
      await DbBufferProducer.initializeSchedules();
      const repeatableJobs = await dbBufferQueue.getRepeatableJobs();
      const names = repeatableJobs.map(j => j.name);
      expect(names).toContain(JobName.PROCESS_MESSAGE_BATCH);
      expect(names).toContain(JobName.PROCESS_READ_BATCH);
    });

    it('forceFlushNow should immediately enqueue one-off PROCESS_MESSAGE_BATCH and PROCESS_READ_BATCH jobs', async () => {
      const waitingBefore = await dbBufferQueue.getWaitingCount();
      await DbBufferProducer.forceFlushNow();
      const waitingAfter = await dbBufferQueue.getWaitingCount();
      expect(waitingAfter).toBeGreaterThanOrEqual(waitingBefore + 1);
    });
  });

  describe('CronProducer', () => {
    it('initializeSchedules should register SWEEP_MATCH_QUEUE, CLEANUP_ARCHIVE_CHATS, and ARCHIVE_EXPIRED_MATCHES with cron patterns', async () => {
      await CronProducer.initializeSchedules();
      const repeatableJobs = await cronQueue.getRepeatableJobs();
      const byName = Object.fromEntries(repeatableJobs.map(j => [j.name, j]));

      expect(byName[JobName.SWEEP_MATCH_QUEUE]).toBeDefined();
      expect(byName[JobName.SWEEP_MATCH_QUEUE]!.pattern).toBe('*/2 * * * *');

      expect(byName[JobName.CLEANUP_ARCHIVE_CHATS]).toBeDefined();
      expect(byName[JobName.CLEANUP_ARCHIVE_CHATS]!.pattern).toBe('0 3 * * *');

      expect(byName[JobName.ARCHIVE_EXPIRED_MATCHES]).toBeDefined();
      expect(byName[JobName.ARCHIVE_EXPIRED_MATCHES]!.pattern).toBe('* * * * *');
    });

    it('forceCleanupNow / forceSweepNow / forceArchiveExpiredNow should each enqueue exactly one immediate job', async () => {
      const before = await cronQueue.getWaitingCount();
      await CronProducer.forceCleanupNow();
      await CronProducer.forceSweepNow();
      await CronProducer.forceArchiveExpiredNow();
      const after = await cronQueue.getWaitingCount();
      expect(after).toBeGreaterThanOrEqual(before + 3);
    });
  });
});