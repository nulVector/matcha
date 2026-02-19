import { RedisManager } from "@matcha/redis";

const connectionString = process.env.REDIS_URL;
if (!connectionString) {
  throw new Error("Environment variables not availble");
}

export const redisManager = new RedisManager(connectionString);