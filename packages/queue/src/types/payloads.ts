import { JobName } from "../constant/keys";

//TASK QUEUE PAYLOAD
export interface ProfileInitPayload {
  userId: string;
  username: string;
  locationLatitude: number;
  locationLongitude: number;
  interest: string[];
  traceId?: string;
}
export interface SendEmailPayload {
  to: string;
  subject: string;
  template: "PASSWORD_RESET" | "WELCOME";
  context: Record<string, string>;
  traceId?: string;
}
export interface HandleDroppedMatchPayload {
  userId: string;
  connectionId: string;
  partnerId: string;
  traceId?: string;
}

// DB BUFFER QUEUE PAYLOADS
export interface ProcessMessageBatchPayload {
  batchSize?: number;
}
export type ProcessReadBatchPayload = Record<string, never>;

// CRON QUEUE PAYLOADS
export type CleanupArchiveChatsPayload = Record<string, never>;
export type SweepMatchQueuePayload = Record<string, never>;
export type ArchiveExpiredMatchesPayload = Record<string, never>;
 
export type TaskQueueJob = 
  | { name: JobName.PROFILE_INIT; data: ProfileInitPayload }
  | { name: JobName.SEND_EMAIL; data: SendEmailPayload }
  | { name: JobName.HANDLE_DROPPED_MATCH; data: HandleDroppedMatchPayload };

export type DbBufferQueueJob = 
  | { name: JobName.PROCESS_MESSAGE_BATCH; data: ProcessMessageBatchPayload }
  | { name: JobName.PROCESS_READ_BATCH; data: ProcessReadBatchPayload };

export type CronQueueJob = 
  | { name: JobName.CLEANUP_ARCHIVE_CHATS; data: CleanupArchiveChatsPayload }
  | { name: JobName.SWEEP_MATCH_QUEUE; data: SweepMatchQueuePayload }
  | { name: JobName.ARCHIVE_EXPIRED_MATCHES; data: ArchiveExpiredMatchesPayload };