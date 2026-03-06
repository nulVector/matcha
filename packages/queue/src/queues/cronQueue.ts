import { Queue } from "bullmq";
import { queueConnection } from "../config/connection";
import { QueueName } from "../constant/keys";

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