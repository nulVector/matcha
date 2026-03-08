import { JobName } from "../constant/keys";
import { cronQueue } from "../queues/cronQueue";

export const CronProducer = {
  async initializeSchedules() {
    await cronQueue.add(
      JobName.SWEEP_MATCH_QUEUE,
      {}, 
      {
        repeat: {
          pattern: "*/2 * * * *",
        },
        jobId: `schedule-${JobName.SWEEP_MATCH_QUEUE}`, 
      }
    );
    await cronQueue.add(
      JobName.CLEANUP_ARCHIVE_CHATS,
      {},
      {
        repeat: {
          pattern: "0 3 * * *",
        },
        jobId: `schedule-${JobName.CLEANUP_ARCHIVE_CHATS}`,
      }
    );
    await cronQueue.add(
      JobName.ARCHIVE_EXPIRED_MATCHES,
      {},
      {
        repeat: {
          pattern: "* * * * *",
        },
        jobId: `schedule-${JobName.ARCHIVE_EXPIRED_MATCHES}`,
      }
    );
  },
  async forceCleanupNow() {
    return await cronQueue.add(JobName.CLEANUP_ARCHIVE_CHATS, {});
  },
  async forceSweepNow() {
    return await cronQueue.add(JobName.SWEEP_MATCH_QUEUE, {});
  },
  async forceArchiveExpiredNow() {
    return await cronQueue.add(JobName.ARCHIVE_EXPIRED_MATCHES, {});
  }
};