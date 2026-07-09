import Redis, { RedisOptions } from "ioredis";
import { logger } from "@matcha/logger";

export type { Redis as RedisClient } from "ioredis";

export * from "./managers/auth";
export * from "./managers/bloom";
export * from "./managers/chat";
export * from "./managers/match";
export * from "./managers/metadata";
export * from "./managers/notification";
export * from "./managers/userConnection";
export * from "./managers/userDetails";

export * from "./common";

export type RedisClientType = "SESSION" 
  | "CACHE" 
  | "PUBSUB_PUB" 
  | "PUBSUB_SUB" 
  | "MATCH"
  | "SYSTEM";

export function createRedisClient(connectionString: string, type: RedisClientType): Redis {
  const options: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: type !== "PUBSUB_SUB",
    keepAlive: 10000,
    retryStrategy(times) {
      return Math.min(times * 50, 2000);
    },
    reconnectOnError(err) {
      const targetError = "READONLY";
      if (err.message.includes(targetError)) return true;
      return false;
    }
  };
  if (type === "PUBSUB_SUB") {
    options.enableReadyCheck = false;
  }
  const client = new Redis(connectionString, options);

  client.on("error", (err: any) => {
    if (err.code === "EPIPE" || err.code === "ECONNRESET" || (err.message && err.message.includes("Connection is closed"))) {
      return
    }
    logger.error({ err, clientType: type }, `Redis ${type} connection error`);
  });
  client.on("connect", () => {
    logger.info(`Redis ${type} connected successfully.`);
  });

  return client;
}