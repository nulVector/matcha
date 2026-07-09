import { CronQueueJob, JobName, QueueName } from "@matcha/queue";
import { Job, Worker } from "bullmq";
import prisma, { ConnectionStatus } from "@matcha/prisma";
import { ConnectionListType, UserState } from "@matcha/redis";
import { logger, traceStorage } from "@matcha/logger";
import { EventType } from "@matcha/shared";
import { createId } from "@paralleldrive/cuid2";
import { chatManager, matchManager, userConnectionManager, workerConnection } from "../config/redis";
import { jobDurationHistogram } from "../config/metrics";

export const cronWorker = new Worker(
  QueueName.CRON,
  async (job: Job) => {
    const endTimer = jobDurationHistogram.labels(QueueName.CRON, job.name).startTimer();
    const cronTraceId = job.id || createId();
    try{
      return await traceStorage.run({ traceId: cronTraceId }, async () => {
        const task = { name: job.name, data: job.data } as CronQueueJob;
        switch (task.name) {
          case JobName.CLEANUP_ARCHIVE_CHATS: {
            const expiredConnections = await prisma.connection.findMany({
              where: { finalDeleteAt: { lte: new Date() } },
              select: { id: true, user1Id: true, user2Id: true }
            });
            if (expiredConnections.length === 0) break;
            const connectionIds = expiredConnections.map((c) => c.id);
            await prisma.connection.deleteMany({
              where: { id: { in: connectionIds } },
            });
            const cachePromises = expiredConnections.flatMap(conn => [
              userConnectionManager.clearConnectionInfo(conn.id)
            ]);
            await Promise.all(cachePromises);
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
            const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
            await prisma.connection.updateMany({
              where: { id: { in: connectionIds } },
              data: { 
                status: ConnectionStatus.ARCHIVED,
                expiresAt: null,
                finalDeleteAt: new Date(Date.now() + FIVE_DAYS_MS)
              },
            });
            const publishPromises = [];
            for (const conn of expiredConnections) {
              const matchTraceId = createId();
              const matchPromise = traceStorage.run({ traceId: matchTraceId }, async () => {
                logger.info({ connectionId: conn.id }, "Cron archiving expired match");
                const payload = JSON.stringify({
                  eventType: EventType.MATCH_EXPIRED,
                  eventData: { connectionId: conn.id },
                  traceId: matchTraceId
                });
                await Promise.all([
                  chatManager.publish('chat_router', JSON.stringify({ receiverId: conn.user1Id, ...JSON.parse(payload) })),
                  chatManager.publish('chat_router', JSON.stringify({ receiverId: conn.user2Id, ...JSON.parse(payload) })),
                  matchManager.clearMatchInfo(conn.id),
                  matchManager.clearMatchVotes(conn.id),
                  matchManager.clearMatchTimer(conn.id),
                  matchManager.leaveQueue(conn.user1Id, UserState.IDLE),
                  matchManager.leaveQueue(conn.user2Id, UserState.IDLE),
                  userConnectionManager.setConnectionInfo(conn.id, conn.user1Id, conn.user2Id, ConnectionListType.ARCHIVED)
                ]);
              });
              publishPromises.push(matchPromise);
            }
            await Promise.all(publishPromises);
            break;
          }
          case JobName.SWEEP_MATCH_QUEUE: {
            const usersInQueue = await matchManager.getUsersInQueue(); 
            if (usersInQueue.length === 0) break;
            const CHUNK_SIZE = 500;
            for (let i = 0; i < usersInQueue.length; i += CHUNK_SIZE) {
              const chunk = usersInQueue.slice(i, i + CHUNK_SIZE);
              const statuses = await Promise.all(
                chunk.map(id => userConnectionManager.checkUserStatus(id))
              );
              const offlineUsers = chunk.filter((_, index) => !statuses[index]);
              if (offlineUsers.length > 0) {
                await Promise.all(
                  offlineUsers.map(id => matchManager.leaveQueue(id, UserState.IDLE))
                );
              }
              await new Promise(resolve => setTimeout(resolve, 5));
            }
            break;
          }
          default: {
            const _exhaustiveCheck: never = task;
            throw new Error(`[CronWorker] Unknown job name encountered: ${job.name}`);
          }
        }
      });
    } finally {
      endTimer();
    }
  },
  {
    connection: workerConnection,
    concurrency: 1,
  }
);
cronWorker.on("failed", (job, err) => {
  const traceId = job?.id || "unknown";
  traceStorage.run({ traceId }, () => {
    logger.error({ err, jobName: job?.name }, "Cron job failed");
  });
});

cronWorker.on("error", (err: any) => {
  if (err.code === 'EPIPE' || err.code === 'ECONNRESET') return;
  logger.error({ err }, "Task Worker Error");
});