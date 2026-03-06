import { JobsOptions, Job } from "bullmq";
import { taskQueue } from "../queues/taskQueue";
import { JobName } from "../constant/keys";
import { ProfileInitPayload, SendEmailPayload } from "../types/payloads";

export const TaskProducer = {
  async dispatchProfileInit(
    data: ProfileInitPayload,
    options?: JobsOptions
  ): Promise<Job> {
    return await taskQueue.add(JobName.PROFILE_INIT, data, {
      ...options,
    });
  },

  async dispatchSendEmail(
    data: SendEmailPayload,
    options?: JobsOptions
  ): Promise<Job> {
    return await taskQueue.add(JobName.SEND_EMAIL, data, {
      ...options,
    });
  }
};