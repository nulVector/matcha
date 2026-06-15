import {
  createRedisClient,
  ChatManager,
  UserConnectionManager,
  UserDetailManager,
  MatchManager,
  AuthManager,
  RedisClient
} from "@matcha/redis";

const connectionString = process.env.REDIS_URL;
if (!connectionString) {
  throw new Error("Environment variables not availble");
}

export const sessionClient: RedisClient = createRedisClient(connectionString, "SESSION");
export const cacheClient: RedisClient = createRedisClient(connectionString, "CACHE");
export const subClient: RedisClient = createRedisClient(connectionString, "PUBSUB_SUB");
export const pubClient: RedisClient = createRedisClient(connectionString, "PUBSUB_PUB");

export const authManager = new AuthManager(sessionClient);
export const userDetailManager = new UserDetailManager(cacheClient);
export const userConnectionManager = new UserConnectionManager(cacheClient);
export const matchManager = new MatchManager(cacheClient);
export const chatManager = new ChatManager(cacheClient, pubClient);

export async function closeRedisConnections() {
  await Promise.all([
    sessionClient.quit(),
    cacheClient.quit(),
    subClient.quit(),
    pubClient.quit()
  ]);
}