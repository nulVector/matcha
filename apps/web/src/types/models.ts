export interface BaseUser {
  username: string;
  avatarUrl: string;
}

export interface TargetUser extends BaseUser {
  id?: string;
  isActive?: boolean;
  openingQues?: string | null;
}

export interface ConnectionItem extends BaseUser {
  connectionId: string;
  isActive?: boolean; 
}

export interface UserSettingsProfile extends BaseUser {
  location: string;
  locationLatitude: number;
  locationLongitude: number;
  interest: string[];
  aboutMe?: string | null;
  openingQues?: string | null;
  allowDiscovery: boolean;
}

export interface LocationMetadata {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface InterestMetadata {
  id: string;
  name: string;
  category: string;
  emoji: string;
}

export interface AvatarMetadata {
  id: string;
  url: string;
}

export interface Metadata {
  locations: LocationMetadata[];
  interests: InterestMetadata[];
  avatars: AvatarMetadata[];
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId?: string | null;
  createdAt: string;
  type: string;
  isOutbox?: boolean;
  status?: "pending" | "failed";
  isRead?: boolean;
}

export interface MatchState {
  connectionId: string;
  expiresAt: string;
  matchedUserId: string;
}

export interface ChatMatchData {
  id: string;
  status: string;
  expiresAt?: string | null;
  partnerRequested?: string | null;
  iRequestedExtend?: boolean;
  iRequestedConvert?: boolean;
}

export interface FriendRequestItem {
  requestId: string;
  origin: string;
  connectionId?: string | null;
  type: "INCOMING" | "OUTGOING";
  user: BaseUser;
}