import { RedisManager } from "@matcha/redis";
import Redis, { RedisOptions } from "ioredis";

const connectionString = process.env.REDIS_URL;
if(!connectionString) {
  throw new Error("Environment variables not availble")
}

export const redisManager = new RedisManager(connectionString);

const workerOptions: RedisOptions = {
  maxRetriesPerRequest: null,
}

export const workerConnection = new Redis(connectionString, workerOptions);