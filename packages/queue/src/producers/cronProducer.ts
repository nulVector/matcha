import { cronQueue } from "../queues/cronQueue";
import { JobName } from "../constant/keys";
import { CleanupArchiveChatsPayload, SweepMatchQueuePayload } from "../types/payloads";

export const CronProducer = {
  async initializeSchedules() {
    await cronQueue.add(
      JobName.SWEEP_MATCH_QUEUE,
      {} as SweepMatchQueuePayload, 
      {
        repeat: {
          pattern: "*/5 * * * *",
        },
        jobId: `schedule-${JobName.SWEEP_MATCH_QUEUE}`, 
      }
    );
    await cronQueue.add(
      JobName.CLEANUP_ARCHIVE_CHATS,
      {} as CleanupArchiveChatsPayload,
      {
        repeat: {
          pattern: "0 3 * * *",
        },
        jobId: `schedule-${JobName.CLEANUP_ARCHIVE_CHATS}`,
      }
    );
  },

//   async forceCleanupNow() {
//     return await cronQueue.add(JobName.CLEANUP_ARCHIVE_CHATS, {} as CleanupArchiveChatsPayload);
//   },

//   async forceSweepNow() {
//     return await cronQueue.add(JobName.SWEEP_MATCH_QUEUE, {} as SweepMatchQueuePayload);
//   }
};