import { Job, Worker } from "bullmq";
import { QueueName, JobName, DbBufferQueueJob } from "@matcha/queue";
import { redisManager, workerConnection } from "../config/redis";
import prisma from "@matcha/prisma";

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
          if (!connectionId || !userId) {
            continue;
          }
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
        const prismaUpdates = connections.map((conn) => {
          const updatesForThisConn = connectionUpdates[conn.id] || [];
          const updateData: any = {};
          for (const update of updatesForThisConn) {
            if (update.userId === conn.user1Id) {
              updateData.user1LastReadId = update.messageId;
              updateData.user1LastReadAt = new Date(update.readAt);
            } else if (update.userId === conn.user2Id) {
              updateData.user2LastReadId = update.messageId;
              updateData.user2LastReadAt = new Date(update.readAt);
            }
          }
          return prisma.connection.update({
            where: { id: conn.id },
            data: updateData,
          });
        });
        await prisma.$transaction(prismaUpdates);
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
  console.error(`Job ${job?.id} failed:`, err.message);
});
dbBufferWorker.on("error", (err) => console.error("Worker Error:", err));