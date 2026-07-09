import { Queue } from "bullmq";
import { queueConnection } from "../config/connection";
import { QueueName } from "../constant/keys";
import { logger } from "@matcha/logger";

export const cronQueue = new Queue(QueueName.CRON, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: {
      count: 10, 
    },
    removeOnFail: {
      count: 100,
    },
  },
});

cronQueue.on('error', (err: any) => {
  if (err.code === 'EPIPE' || err.code === 'ECONNRESET') return;
  logger.error({ err }, "cronQueue Error");
});