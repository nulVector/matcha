import Redis, { RedisOptions } from "ioredis";
import { env } from "./env";

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  keepAlive: 10000,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
  reconnectOnError(err) {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) return true;
    return false;
  },
};
export const queueConnection = new Redis(env.REDIS_URL, redisOptions);