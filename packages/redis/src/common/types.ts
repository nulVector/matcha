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

export enum MessageType {
  TEXT = "TEXT",
  SYSTEM = "SYSTEM"
}

export interface UserProfile {
  id: string;
  username: string;
  aboutMe: string | null;
  isActive: boolean;
  lastSeen: string | null;
  allowDiscovery: boolean;
  openingQues: string | null;
  updatedAt: string;
  avatarUrl: string;
  location: string;
  locationLatitude: number;
  locationLongitude: number;
  interest: string[];
}

export interface UserSession {
  userId: string;
  tokenVersion: number;
  userProfileId: string | null
}

export interface CachedMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;     
  type: MessageType; 
}