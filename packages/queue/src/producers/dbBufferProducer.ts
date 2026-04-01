import { dbBufferQueue } from "../queues/dbBufferQueue";
import { JobName } from "../constant/keys";
import { ProcessMessageBatchPayload, ProcessReadBatchPayload } from "../types/payloads";

const IS_TEST = process.env.ARTILLERY_TEST === "true";
const BATCH_SIZE = IS_TEST ? 5000 : 1000;
const INTERVAL_MS = IS_TEST ? 2000 : 5000;

export const DbBufferProducer = {
  async initializeSchedules() {
    await dbBufferQueue.add(
      JobName.PROCESS_MESSAGE_BATCH,
      { batchSize: BATCH_SIZE } as ProcessMessageBatchPayload,
      {
        repeat: {
          every: INTERVAL_MS,
        },
        jobId: `buffer-${JobName.PROCESS_MESSAGE_BATCH}`, 
      }
    );
    await dbBufferQueue.add(
      JobName.PROCESS_READ_BATCH,
      {},
      {
        repeat: {
          every: INTERVAL_MS,
        },
        jobId: `buffer-${JobName.PROCESS_READ_BATCH}`,
      }
    );
  },
  async forceFlushNow() {
    await Promise.all([
      dbBufferQueue.add(JobName.PROCESS_MESSAGE_BATCH, { batchSize: BATCH_SIZE }),
      dbBufferQueue.add(JobName.PROCESS_READ_BATCH, { batchSize: BATCH_SIZE })
    ]);
  }
};