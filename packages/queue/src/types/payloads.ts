import { JobName } from "../constant/keys";

//TASK QUEUE PAYLOAD
export interface ProfileInitPayload {
  userId: string;
  username: string;
  avatarUrl: string;
  aboutMe?: string | null;
  openingQues?: string | null;
  location: string;
  locationLatitude: number;
  locationLongitude: number;
  interest: string[];
}
export interface SendEmailPayload {
  to: string;
  subject: string;
  template: "PASSWORD_RESET" | "WELCOME";
  context: Record<string, string>;
}

// DB BUFFER QUEUE PAYLOADS
export interface ProcessMessageBatchPayload {
  batchSize?: number;
}
export interface ProcessReadBatchPayload {
}

// CRON QUEUE PAYLOADS
export interface CleanupArchiveChatsPayload {
}
export interface SweepMatchQueuePayload {
}
export interface ArchiveExpiredMatchesPayload {

}
 
export type TaskQueueJob = 
  | { name: JobName.PROFILE_INIT; data: ProfileInitPayload }
  | { name: JobName.SEND_EMAIL; data: SendEmailPayload };

export type DbBufferQueueJob = 
  | { name: JobName.PROCESS_MESSAGE_BATCH; data: ProcessMessageBatchPayload }
  | { name: JobName.PROCESS_READ_BATCH; data: ProcessReadBatchPayload };

export type CronQueueJob = 
  | { name: JobName.CLEANUP_ARCHIVE_CHATS; data: CleanupArchiveChatsPayload }
  | { name: JobName.SWEEP_MATCH_QUEUE; data: SweepMatchQueuePayload }
  | { name: JobName.ARCHIVE_EXPIRED_MATCHES; data: ArchiveExpiredMatchesPayload };