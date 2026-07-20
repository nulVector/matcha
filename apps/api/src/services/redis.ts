import {
  createRedisClient,
  AuthManager,
  UserDetailManager,
  UserConnectionManager,
  MetadataManager,
  ChatManager,
  MatchManager,
  BloomFilterManager,
  NotificationManager,
  RedisClient
} from "@matcha/redis";
import { env } from "../config/env";

const connectionString = env.REDIS_URL;

export const sessionClient: RedisClient = createRedisClient(connectionString, "SESSION");
export const cacheClient: RedisClient = createRedisClient(connectionString, "CACHE");
export const matchClient: RedisClient = createRedisClient(connectionString, "MATCH");
export const pubClient: RedisClient = createRedisClient(connectionString, "PUBSUB_PUB");

export const authManager = new AuthManager(sessionClient);
export const userDetailManager = new UserDetailManager(cacheClient);
export const userConnectionManager = new UserConnectionManager(cacheClient);
export const metadataManager = new MetadataManager(cacheClient);
export const chatManager = new ChatManager(cacheClient, pubClient);
export const matchManager = new MatchManager(matchClient);
export const bloomManager = new BloomFilterManager(cacheClient);
export const notificationManager = new NotificationManager(cacheClient, pubClient);

export async function closeRedisConnections() {
  await Promise.all([
    sessionClient.quit(),
    cacheClient.quit(),
    matchClient.quit(),
    pubClient.quit(),
  ]);
}

export async function pingRedisConnections(): Promise<boolean> {
  try {
    const results = await Promise.all([
      sessionClient.ping(),
      cacheClient.ping(),
      matchClient.ping(),
      pubClient.ping()
    ]);
    return results.every(res => res === 'PONG');
  } catch (_err) {
    return false;
  }
}