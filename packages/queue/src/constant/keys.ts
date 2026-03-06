export enum QueueName {
  TASK = "task_queue",
  DB_BUFFER = "db_buffer_queue",
  CRON = "cron_queue"
}

export enum JobName {
  PROFILE_INIT = "profile_init",
  SEND_EMAIL = "send_email",

  PROCESS_MESSAGE_BATCH = "process_message_batch",
  PROCESS_READ_BATCH = "process_read_batch",

  CLEANUP_ARCHIVE_CHATS = "cleanup_archive_chats",
  SWEEP_MATCH_QUEUE = "sweep_match_queue"
}