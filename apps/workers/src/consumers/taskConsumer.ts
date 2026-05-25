import { JobName, QueueName, TaskQueueJob } from "@matcha/queue";
import { Job, Worker } from "bullmq";
import { redisManager, workerConnection } from "../config/redis";
import { logger } from "@matcha/logger";
import { Resend } from "resend";
import { renderPasswordResetEmail } from "@matcha/emails";
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
        } = task.data;
        await redisManager.bloom.add('bf:usernames', username);
        await redisManager.match.updateMatchProfile(
          userId, 
          locationLatitude, 
          locationLongitude, 
          interest
        );
        break;
      }
      case JobName.SEND_EMAIL:{
        const { to, subject, template, context } = task.data;
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
          logger.info({ to, subject }, "Email sent successfully");
        } catch (err) {
          logger.error({ err, to }, "Failed to send email via Resend");
          throw err; 
        }
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