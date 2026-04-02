import { Job, Worker } from "bullmq";
import { QueueName, JobName, DbBufferQueueJob } from "@matcha/queue";
import { redisManager, workerConnection } from "../config/redis";
import prisma from "@matcha/prisma";
import { logger } from "@matcha/logger";

export const dbBufferWorker = new Worker(
  QueueName.DB_BUFFER,
  async (job: Job) => {
    const task = { name: job.name, data: job.data } as DbBufferQueueJob;
    switch (task.name) {
      case JobName.PROCESS_MESSAGE_BATCH: {
        const batchSize = task.data.batchSize || 500;
        const messages = await redisManager.chat.getMessageBufferBatch(batchSize);
        if (messages.length === 0) {
          return;
        }
        const messagesToInsert = messages.map((msg) => ({
          id: msg.id,
          connectionId: msg.connectionId,
          senderId: msg.senderId,
          content: msg.content,
          type: msg.type,
          createdAt: new Date(msg.createdAt),
        }));
        await prisma.message.createMany({
          data: messagesToInsert,
          skipDuplicates: true,
        });
        const uniqueConnectionIds = [...new Set(messages.map(msg => msg.connectionId))];
        if (uniqueConnectionIds.length > 0) {
          await prisma.connection.updateMany({
            where: { id: { in: uniqueConnectionIds } },
            data: { updatedAt: new Date() }
          });
        }
        await redisManager.chat.trimMessageBufferBatch(messages.length);
        break;
      }
      case JobName.PROCESS_READ_BATCH: {
        const reads = await redisManager.chat.extractReadReceiptBuffer();
        if (!reads || Object.keys(reads).length === 0) {
          return;
        }
        const readEntries = Object.entries(reads);
        const connectionUpdates: Record<string, { userId: string; messageId: string; readAt: string }[]> = {};
        for (const [hashField, jsonStr] of readEntries) {
          const parts = hashField.split(":");
          const connectionId = parts[0];
          const userId = parts[1];
          if (!connectionId || !userId) continue; 
          const parsed = JSON.parse(jsonStr);
          if (!connectionUpdates[connectionId]) {
            connectionUpdates[connectionId] = [];
          }
          connectionUpdates[connectionId].push({ userId, messageId: parsed.messageId, readAt: parsed.readAt });
        }
        const connectionIds = Object.keys(connectionUpdates);
        const connections = await prisma.connection.findMany({
          where: { id: { in: connectionIds } },
          select: { id: true, user1Id: true, user2Id: true },
        });
        const pgConnIds: string[] = [];
        const pgU1Ids: (string | null)[] = [];
        const pgU1Ats: (Date | null)[] = [];
        const pgU2Ids: (string | null)[] = [];
        const pgU2Ats: (Date | null)[] = [];
        for (const conn of connections) {
          const updatesForThisConn = connectionUpdates[conn.id] || [];
          if (updatesForThisConn.length === 0) continue;
          let u1Id: string | null = null;
          let u1At: Date | null = null;
          let u2Id: string | null = null;
          let u2At: Date | null = null;
          for (const update of updatesForThisConn) {
            if (update.userId === conn.user1Id) {
              u1Id = update.messageId;
              u1At = new Date(update.readAt);
            } else if (update.userId === conn.user2Id) {
              u2Id = update.messageId;
              u2At = new Date(update.readAt);
            }
          }
          pgConnIds.push(conn.id);
          pgU1Ids.push(u1Id);
          pgU1Ats.push(u1At);
          pgU2Ids.push(u2Id);
          pgU2Ats.push(u2At);
        }
        if (pgConnIds.length > 0) {
          await prisma.$executeRawUnsafe(`
            UPDATE "Connection" AS c
            SET 
              "user1LastReadId" = COALESCE(v.u1_id, c."user1LastReadId"),
              "user1LastReadAt" = COALESCE(v.u1_at, c."user1LastReadAt"),
              "user2LastReadId" = COALESCE(v.u2_id, c."user2LastReadId"),
              "user2LastReadAt" = COALESCE(v.u2_at, c."user2LastReadAt")
            FROM (
              SELECT * FROM UNNEST(
                $1::text[], 
                $2::text[], 
                $3::timestamp[], 
                $4::text[], 
                $5::timestamp[]
              )
            ) AS v(conn_id, u1_id, u1_at, u2_id, u2_at)
            WHERE c.id = v.conn_id
          `, pgConnIds, pgU1Ids, pgU1Ats, pgU2Ids, pgU2Ats);
        }
        break;
      }
      default:
        const exhaustiveCheck: never = task;
        throw new Error(`DbBufferWorker Unknown job name encountered: ${job.name}`);
    }
  },
  {
    connection: workerConnection,
    concurrency: 1, 
  }
);
dbBufferWorker.on("failed", (job, err) => {
  logger.error({ err, jobId: job?.id, jobName: job?.name }, "DbBuffer job failed");
});

dbBufferWorker.on("error", (err) => {
  logger.error({ err }, "DbBuffer Worker Error");
});