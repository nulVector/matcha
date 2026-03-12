import { taskWorker } from "./consumers/taskConsumer";
import { dbBufferWorker } from "./consumers/dbBufferConsumer";
import { cronWorker } from "./consumers/cronConsumer";
import { startMatchmakingLoop, stopMatchmakingLoop } from "./consumers/matchConsumer";
import { workerConnection, redisManager } from "./config/redis";
import prisma from "@matcha/prisma";
import { logger } from "@matcha/logger";
import http from "http";

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