import { Queue } from "bullmq";
import { queueConnection } from "../config/connection";
import { QueueName } from "../constant/keys";

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