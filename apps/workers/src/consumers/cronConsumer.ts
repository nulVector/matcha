import { CronQueueJob, JobName, QueueName } from "@matcha/queue";
import { Job, Worker } from "bullmq";
import { redisManager, workerConnection } from "../config/redis";
import prisma, { ConnectionStatus } from "@matcha/prisma";
import { ConnectionListType, UserState } from "@matcha/redis";
import { logger } from "@matcha/logger";
import { EventType } from "@matcha/shared";

export const cronWorker = new Worker(
  QueueName.CRON,
  async (job: Job) => {
    const task = { name: job.name, data: job.data } as CronQueueJob;
    switch (task.name) {
      case JobName.CLEANUP_ARCHIVE_CHATS: {
        await prisma.connection.deleteMany({
          where: {
            finalDeleteAt: {
              lte: new Date(),
            },
          },
        });
        break;
      }
      case JobName.ARCHIVE_EXPIRED_MATCHES: {
        const expiredConnections = await prisma.connection.findMany({
          where: {
            status: ConnectionStatus.MATCHED,
            expiresAt: {
              lte: new Date(),
            },
          },
          select: { id: true, user1Id: true, user2Id: true },
        });
        if (expiredConnections.length === 0) {
          return;
        }
        const connectionIds = expiredConnections.map((c) => c.id);
        await prisma.connection.updateMany({
          where: { id: { in: connectionIds } },
          data: { status: ConnectionStatus.ARCHIVED },
        });
        const publishPromises = [];
        for (const conn of expiredConnections) {
          const payload = JSON.stringify({
            eventType: EventType.MATCH_EXPIRED,
            eventData: { connectionId: conn.id },
          });
          publishPromises.push(
            redisManager.chat.publish('chat_router', JSON.stringify({ receiverId: conn.user1Id, ...JSON.parse(payload) })),
            redisManager.chat.publish('chat_router', JSON.stringify({ receiverId: conn.user2Id, ...JSON.parse(payload) })),
            redisManager.userDetail.invalidateConnectionList(conn.user1Id, ConnectionListType.ARCHIVED),
            redisManager.userDetail.invalidateConnectionList(conn.user2Id, ConnectionListType.ARCHIVED),
          );
        }
        await Promise.all(publishPromises);
        break;
      }
      case JobName.SWEEP_MATCH_QUEUE: {
        const usersInQueue = await redisManager.match.getUsersInQueue(); 
        for (const userId of usersInQueue) {
          const isOnline = await redisManager.userConnection.checkUserStatus(userId);
          if (!isOnline) {
            await redisManager.match.leaveQueue(userId, UserState.IDLE);
          }
        }
        break;
      }
      default:
        const exhaustiveCheck: never = task;
        throw new Error(`[CronWorker] Unknown job name encountered: ${job.name}`);
    }
  },
  {
    connection: workerConnection,
    concurrency: 1,
  }
);
cronWorker.on("failed", (job, err) => {
  logger.error({ err, jobId: job?.id, jobName: job?.name }, "Cron job failed");
});

cronWorker.on("error", (err) => {
  logger.error({ err }, "Cron Worker Error");
});