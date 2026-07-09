import { QueueEvents } from "bullmq";
import { QueueName, dlqQueue, taskQueue, dbBufferQueue, cronQueue } from "@matcha/queue";
import { workerConnection } from "../config/redis";
import { logger } from "@matcha/logger";
import { dlqIncidentsCounter } from "../config/metrics";

const eventListeners: QueueEvents[] = [];

export function startDlqMonitor() {
  const queuesToWatch = [
    { name: QueueName.TASK, queue: taskQueue },
    { name: QueueName.DB_BUFFER, queue: dbBufferQueue },
    { name: QueueName.CRON, queue: cronQueue },
  ];

  queuesToWatch.forEach(({ name, queue }) => {
    const events = new QueueEvents(name, { connection: workerConnection });
    
    events.on("failed", async ({ jobId, failedReason }) => {
      if (!jobId) return;
      try {
        const job = await queue.getJob(jobId);
        if (!job) return;
        const maxAttempts = job.opts.attempts || 1;
        if (job.attemptsMade >= maxAttempts) {
          logger.error({ jobId, queue: name, failedReason }, `Job permanently failed. Moving to DLQ.`);
          const safeReason = failedReason ? failedReason.substring(0, 50) : 'unknown_error';
          dlqIncidentsCounter.labels(name, job.name, safeReason).inc();
          await dlqQueue.add(
            job.name,
            { originalQueue: name, originalData: job.data, error: failedReason },
            { jobId: `dlq-${name}-${jobId}` }
          );
        }
      } catch (err) {
        logger.error({ err, jobId }, "Error processing failed job for DLQ");
      }
    });
    events.on("error", (err: any) => {
      if (err.code === 'EPIPE' || err.code === 'ECONNRESET') return;
      logger.error({ err, queue: name }, "QueueEvents monitor error");
    });
    eventListeners.push(events);
  });
  logger.info("DLQ Monitor actively watching for permanent failures.");
}

export async function stopDlqMonitor() {
  await Promise.all(eventListeners.map(e => e.close()));
}