import { Worker, QueueEvents, Queue } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('BullMQ Queue Integration Tests', () => {
  let queueEvents: QueueEvents;
  let queueConnection: any;
  let taskQueue: Queue;
  let TaskProducer: any;
  let JobName: any;
  let QueueName: any;

  beforeAll(async () => {
    const queueModule = await import('../index.js');
    queueConnection = queueModule.queueConnection;
    taskQueue = queueModule.taskQueue;
    TaskProducer = queueModule.TaskProducer;
    JobName = queueModule.JobName;
    QueueName = queueModule.QueueName;

    queueEvents = new QueueEvents(QueueName.TASK, { connection: queueConnection });
  });
  afterAll(async () => {
    await queueEvents.close();
    await taskQueue.close();
    await queueConnection.quit();
  });

  it('should dispatch and successfully process a PROFILE_INIT job', async () => {
    return new Promise<void>(async (resolve, reject) => {
      const worker = new Worker(QueueName.TASK, async (job) => {
        expect(job.name).toBe(JobName.PROFILE_INIT);
        expect(job.data.username).toBe('test_worker_bot');
        return 'processed';
      }, { connection: queueConnection });
      worker.on('completed', async (job, returnvalue) => {
        try {
          expect(returnvalue).toBe('processed');
          await worker.close();
          resolve();
        } catch (err) {
          await worker.close();
          reject(err);
        }
      });
      worker.on('failed', async (job, err) => {
        await worker.close();
        reject(err);
      });
      await TaskProducer.dispatchProfileInit({
        userId: 'user_123',
        username: 'test_worker_bot',
        locationLatitude: 10.0,
        locationLongitude: 20.0,
        interest: ['coding']
      });
    });
  });

  it('should handle job failure, follow the attempt limit, and retry successfully', async () => {
    return new Promise<void>(async (resolve, reject) => {
      let executionCount = 0;
      const worker = new Worker(QueueName.TASK, async (job) => {
        executionCount++;
        if (executionCount < 3) {
          throw new Error('Simulated network failure');
        }
        return 'success on try 3';
      }, { connection: queueConnection });
      worker.on('completed', async (job) => {
        try {
          expect(executionCount).toBe(3);
          expect(job.attemptsMade).toBe(3);
          await worker.close();
          resolve();
        } catch (err) {
          await worker.close();
          reject(err);
        }
      });
      await TaskProducer.dispatchProfileInit({
        userId: 'user_retry',
        username: 'retry_bot',
        locationLatitude: 0,
        locationLongitude: 0,
        interest: []
      }, { 
        attempts: 3, 
        backoff: { type: 'fixed', delay: 10 }
      });
    });
  });
});