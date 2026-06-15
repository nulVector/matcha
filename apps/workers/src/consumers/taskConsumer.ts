import { JobName, QueueName, TaskQueueJob } from "@matcha/queue";
import { Job, Worker } from "bullmq";
import { logger } from "@matcha/logger";
import prisma, { ConnectionStatus } from "@matcha/prisma";
import { Resend } from "resend";
import { renderPasswordResetEmail } from "@matcha/emails";
import { ConnectionListType, UserState } from "@matcha/redis";
import { EventType, SystemAction } from "@matcha/shared";
import { bloomManager, chatManager, matchManager, userConnectionManager, workerConnection } from "../config/redis";
const resend = new Resend(process.env.RESEND_API_KEY);

export const taskWorker = new Worker(
  QueueName.TASK, 
  async (job: Job)=>{
    const task = { name: job.name, data: job.data } as TaskQueueJob;
    switch (task.name){
      case JobName.PROFILE_INIT:{
        const {
          userId,
          username,
          locationLatitude,
          locationLongitude,
          interest,
          traceId
        } = task.data;
        await bloomManager.add('bf:usernames', username);
        await matchManager.updateMatchProfile(
          userId, 
          locationLatitude, 
          locationLongitude, 
          interest
        );
        logger.info({ traceId, userId, username }, "Profile initialization complete");
        break;
      }
      case JobName.SEND_EMAIL:{
        const { to, subject, template, context, traceId } = task.data;
        let html = '';
        if (template === "PASSWORD_RESET") {
          html = await renderPasswordResetEmail({
            resetUrl: context.resetUrl!,
            expiresIn: context.expiresIn!
          });
        }
        try {
          await resend.emails.send({
            from: 'Matcha <noreply@mail.trymatcha.in>',
            to: [to],
            subject: subject,
            html: html,
          });
          logger.info({ to, subject, traceId }, "Email sent successfully");
        } catch (err) {
          logger.error({ err, traceId, to }, "Failed to send email via Resend");
          throw err; 
        }
        break;
      }
      case JobName.HANDLE_DROPPED_MATCH:{
        const { userId, connectionId, partnerId, traceId } = task.data;
        const socketCount = await userConnectionManager.countSockets(userId);
        if (socketCount > 0) {
          logger.info({ userId, connectionId }, "User reconnected during grace period. Aborting match drop.");
          break; 
        }
        const connection = await prisma.connection.findUnique({
          where: { id: connectionId }
        });
        if (connection?.status !== ConnectionStatus.MATCHED) break;
        logger.info({ traceId, userId, connectionId }, "Grace period expired. Terminating abandoned match.");
        const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
        await prisma.connection.update({
          where: { id: connectionId },
          data: { 
            status: ConnectionStatus.ARCHIVED,
            expiresAt: null,
            finalDeleteAt: new Date(Date.now() + FIVE_DAYS_MS)
          }
        });
        await Promise.all([
          matchManager.clearMatchVotes(connectionId),
          matchManager.clearMatchTimer(connectionId),
          matchManager.clearMatchInfo(connectionId),
          userConnectionManager.setConnectionInfo(connectionId, userId, partnerId, ConnectionListType.ARCHIVED),
          matchManager.leaveQueue(userId, UserState.IDLE),
          matchManager.leaveQueue(partnerId, UserState.IDLE),
        ]);
        await chatManager.publish(
          'chat_router',
          JSON.stringify({
            receiverId: partnerId,
            eventType: EventType.SYSTEM_EVENT,
            eventData: {
              event: SystemAction.CHAT_ENDED,
              connectionId
            },
            traceId
          })
        );
        break;
      }
      default:
        const exhaustiveCheck: never = task;
        throw new Error(`TaskWorker Unknown job name encountered: ${job.name}`);
    }
  },
  {
    connection: workerConnection,
    concurrency: 5, 
  }
)
taskWorker.on("failed", (job, err) => {
  logger.error({ err, jobId: job?.id, jobName: job?.name }, "Task job failed");
});

taskWorker.on("error", (err) => {
  logger.error({ err }, "Task Worker Error");
});