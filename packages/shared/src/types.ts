import { VIBE_OPTIONS } from "./constants";

export interface JwtPayload {
  id:string,
  sessionId: string,
  tokenVersion:number
}
export interface UserSession {
  userId: string;
  tokenVersion: number;
  userProfileId: string | null;
  hasPassword: boolean
}
export enum EventType {
  // Chat events
  CHAT_MESSAGE = "CHAT_MESSAGE",
  USER_TYPING = "USER_TYPING",
  STOPPED_TYPING = "STOPPED_TYPING",
  MESSAGE_READ = "MESSAGE_READ",
  // System events
  SYSTEM_EVENT = "SYSTEM_EVENT",
  MATCH_FOUND = "MATCH_FOUND",
  MATCH_EXPIRED = "MATCH_EXPIRED",
  NOTIFICATION_UPDATE = "NOTIFICATION_UPDATE"
}
export enum SystemAction {
  EXTEND_REQUESTED = "EXTEND_REQUESTED",
  EXTEND_ACCEPTED = "EXTEND_ACCEPTED",
  CONVERT_REQUESTED = "CONVERT_REQUESTED",
  CONVERT_ACCEPTED = "CONVERT_ACCEPTED",
  CHAT_ENDED = "CHAT_ENDED"
}
export type VibeType = typeof VIBE_OPTIONS[number];
