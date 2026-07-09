import { Queue } from "bullmq";
import { queueConnection } from "../config/connection";
import { QueueName } from "../constant/keys";
import { logger } from "@matcha/logger";

export const dlqQueue = new Queue(QueueName.DLQ, {
  connection: queueConnection,
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
  },
});

dlqQueue.on('error', (err: any) => {
  if (err.code === 'EPIPE' || err.code === 'ECONNRESET') return;
  logger.error({ err }, "dlqQueue Error");
});