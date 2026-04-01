import { taskWorker } from "./consumers/taskConsumer";
import { dbBufferWorker } from "./consumers/dbBufferConsumer";
import { cronWorker } from "./consumers/cronConsumer";
import { startMatchmakingLoop, stopMatchmakingLoop } from "./consumers/matchConsumer";
import { workerConnection, redisManager } from "./config/redis";
import prisma from "@matcha/prisma";
import { logger } from "@matcha/logger";
import http from "http";
import { CronProducer, DbBufferProducer } from "@matcha/queue";

const healthServer = http.createServer(async (req, res) => {
  if (req.url === '/health') {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const redisPing = await workerConnection.ping();
      const managerRedisPing = await redisManager.ping()
      if (redisPing === 'PONG' && managerRedisPing) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', worker: 'up' }));
      } else {
        throw new Error("Worker Redis ping failed");
      }
    } catch (err) {
      logger.error({ err }, "Worker health check failed");
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'unhealthy', worker: 'down' }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

async function bootstrap() {
  logger.info("Starting Matcha Worker Node.");
  const HEALTH_PORT = process.env.WORKER_HEALTH_PORT || 3002;
  healthServer.listen(HEALTH_PORT, () => {
    logger.info(`Worker Health Check server listening on port ${HEALTH_PORT}`);
  });

  logger.info(`Task Worker listening on ${taskWorker.name}`);
  logger.info(`DB Buffer Worker listening on ${dbBufferWorker.name}`);
  logger.info(`Cron Worker listening on ${cronWorker.name}`);
  try {
    logger.info("Initializing Recurring Jobs");
    await CronProducer.initializeSchedules();
    await DbBufferProducer.initializeSchedules(); 
    logger.info("Recurring Jobs successfully registered in BullMQ!");
  } catch (err) {
    logger.error({ err }, "Failed to initialize Recurring Jobs");
  }

  logger.info(`Initializing Matchmaking Consumer...`);
  startMatchmakingLoop().catch((err: any) => {
    logger.error({ err }, "Native Matchmaking Loop crashed:");
  });
  
  logger.info("All background services are up and running!");
}

let isShuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`Received ${signal}, shutting down workers gracefully...`);
  stopMatchmakingLoop();
  try {
    await Promise.all([
      taskWorker.close(),
      dbBufferWorker.close(),
      cronWorker.close()
    ]);
    logger.info("Queue workers closed successfully.");
  } catch (err) {
    logger.error({ err }, "Error closing queue workers");
  }
  healthServer.close();
  try {
    await workerConnection.quit();
    await redisManager.quit();
    await prisma.$disconnect();
    logger.info("Data store connections closed successfully.");
  } catch (err) {
    logger.error({ err }, "Error closing data stores");
  }
  logger.info("Worker graceful shutdown complete.");
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

bootstrap().catch((err: any) => {
  logger.error({ err }, "Failed to bootstrap worker node:");
  process.exit(1);
});