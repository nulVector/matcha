import Redis, { RedisOptions } from "ioredis";

const connectionString = process.env.REDIS_URL;

if (!connectionString) {
  throw new Error("REDIS_URL is missing from environment variables for BullMQ.");
}
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
export const queueConnection = new Redis(connectionString, redisOptions);