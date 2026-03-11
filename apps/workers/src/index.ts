import { taskWorker } from "./consumers/taskConsumer";
import { dbBufferWorker } from "./consumers/dbBufferConsumer";
import { cronWorker } from "./consumers/cronConsumer";
import { startMatchmakingLoop, stopMatchmakingLoop } from "./consumers/matchConsumer";
import { workerConnection, redisManager } from "./config/redis";
import prisma from "@matcha/prisma";
import { logger } from "@matcha/logger";

async function bootstrap() {
  logger.info("Starting Matcha Worker Node.");
  logger.info(`Task Worker listening on ${taskWorker.name}`);
  logger.info(`DB Buffer Worker listening on ${dbBufferWorker.name}`);
  logger.info(`Cron Worker listening on ${cronWorker.name}`);
  logger.info(`Initializing Matchmaking Consumer...`);
  
  startMatchmakingLoop().catch((err: any) => {
    logger.error({ err }, "Native Matchmaking Loop crashed:");
  });
  logger.info("All background services are up and running!");
}

bootstrap().catch((err: any) => {
  logger.error({ err }, "Failed to bootstrap worker node:");
  process.exit(1);
});