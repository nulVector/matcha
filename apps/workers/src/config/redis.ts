import Redis, { RedisOptions } from "ioredis";
import {
  createRedisClient,
  MatchManager,
  BloomFilterManager,
  ChatManager,
  UserConnectionManager,
  UserDetailManager
} from "@matcha/redis";

const connectionString = process.env.REDIS_URL;
if(!connectionString) {
  throw new Error("Environment variables not availble")
}

export const cacheClient = createRedisClient(connectionString, "CACHE");
export const matchClient = createRedisClient(connectionString, "MATCH");
export const pubClient = createRedisClient(connectionString, "PUBSUB_PUB");

export const matchManager = new MatchManager(matchClient);
export const bloomManager = new BloomFilterManager(cacheClient);
export const chatManager = new ChatManager(cacheClient, pubClient);
export const userConnectionManager = new UserConnectionManager(cacheClient);
export const userDetailManager = new UserDetailManager(cacheClient);

export async function closeRedisConnections() {
  await Promise.all([
    cacheClient.quit(),
    matchClient.quit(),
    pubClient.quit()
  ]);
}

export async function pingRedisConnections(): Promise<boolean> {
  try {
    const results = await Promise.all([
      cacheClient.ping(),
      matchClient.ping(),
      pubClient.ping()
    ]);
    return results.every(res => res === 'PONG');
  } catch (_err) {
    return false;
  }
}

const workerOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
  reconnectOnError(err) {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) return true;
    return false;
  },
}

export const workerConnection = new Redis(connectionString, workerOptions);