import { JobsOptions, Job } from "bullmq";
import { taskQueue } from "../queues/taskQueue";
import { JobName } from "../constant/keys";
import { HandleDroppedMatchPayload, ProfileInitPayload, SendEmailPayload } from "../types/payloads";

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
  },

  async dispatchHandleDroppedMatch(
    data: HandleDroppedMatchPayload,
    options?: JobsOptions
  ): Promise<Job> {
    return await taskQueue.add(JobName.HANDLE_DROPPED_MATCH, data, {
      delay: 15000,
      jobId: `grace-period-${data.userId}-${data.connectionId}`,
      ...options,
    });
  }
};