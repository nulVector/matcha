import Redis, { RedisOptions } from "ioredis";

const connectionString = process.env.REDIS_URL;

if (!connectionString) {
  throw new Error("REDIS_URL is missing from environment variables for BullMQ.");
}
const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
};
export const queueConnection = new Redis(connectionString, redisOptions);