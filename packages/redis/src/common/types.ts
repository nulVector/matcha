export enum UserStatus {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  QUEUE = "QUEUE",
  MATCHED = "MATCHED"
}

export enum ConnectionListType {
  FRIEND = "FRIEND",
  ARCHIVED = "ARCHIVED"
}

export enum RequestListType {
  SENT = "SENT",
  RECEIVED = "RECEIVED",
}

export enum MessageType {
  TEXT = "TEXT",
  SYSTEM = "SYSTEM"
}

export interface UserProfile {
  id: string;
  username: string;
  aboutMe: string;
  isActive: boolean;
  lastSeen: string;
  allowDiscovery: boolean;
  openingQues: string;
  updatedAt: string;
  avatarUrl: string;
  location: string;
  locationLatitude: number;
  locationLongitude: number;
  interest: string[];
}

export type UserAuthProfile = Pick<UserProfile, 'id' | 'username' | 'avatarUrl'>;

export interface UserSession {
  userId: string;
  email: string;
  tokenVersion: number;
  profile: UserAuthProfile;
}

export interface CachedMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;     
  type: MessageType; 
}