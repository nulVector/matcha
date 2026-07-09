import { Queue } from "bullmq";
import { queueConnection } from "../config/connection";
import { QueueName } from "../constant/keys";
import { logger } from "@matcha/logger";

export const dbBufferQueue = new Queue(QueueName.DB_BUFFER, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3, 
    backoff: {
      type: "fixed",
      delay: 2000,
    },
    removeOnComplete: {
      count: 10,
    },
    removeOnFail: {
      count: 100,
    },
  },
});

dbBufferQueue.on('error', (err: any) => {
  if (err.code === 'EPIPE' || err.code === 'ECONNRESET') return;
  logger.error({ err }, "dbBufferQueue Error");
});