import { dbBufferQueue } from "../queues/dbBufferQueue";
import { JobName } from "../constant/keys";
import { ProcessMessageBatchPayload, ProcessReadBatchPayload } from "../types/payloads";

export const DbBufferProducer = {
  async initializeSchedules() {
    await dbBufferQueue.add(
      JobName.PROCESS_MESSAGE_BATCH,
      { batchSize: 500 } as ProcessMessageBatchPayload,
      {
        repeat: {
          every: 5000,
        },
        jobId: `buffer-${JobName.PROCESS_MESSAGE_BATCH}`, 
      }
    );
    await dbBufferQueue.add(
      JobName.PROCESS_READ_BATCH,
      { batchSize: 1000 } as ProcessReadBatchPayload,
      {
        repeat: {
          every: 10000,
        },
        jobId: `buffer-${JobName.PROCESS_READ_BATCH}`,
      }
    );
  },
  async forceFlushNow() {
    await Promise.all([
      dbBufferQueue.add(JobName.PROCESS_MESSAGE_BATCH, { batchSize: 5000 }),
      dbBufferQueue.add(JobName.PROCESS_READ_BATCH, { batchSize: 5000 })
    ]);
  }
};