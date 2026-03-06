import { Queue } from "bullmq";
import { queueConnection } from "../config/connection";
import { QueueName } from "../constant/keys";

export const taskQueue = new Queue(QueueName.TASK, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 4, 
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: {
      count: 10,
    },
    removeOnFail: {
      age: 24 * 3600,
      count: 1000,
    },
  },
});