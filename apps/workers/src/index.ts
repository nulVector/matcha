import { taskWorker } from "./consumers/taskConsumer";
import { dbBufferWorker } from "./consumers/dbBufferConsumer";
import { cronWorker } from "./consumers/cronConsumer";
import { startMatchmakingLoop, stopMatchmakingLoop } from "./consumers/matchConsumer";
import { closeRedisConnections, pingRedisConnections, workerConnection } from "./config/redis";
import prisma from "@matcha/prisma";
import { logger } from "@matcha/logger";
import http from "http";
import { CronProducer, cronQueue, DbBufferProducer, dbBufferQueue, dlqQueue, taskQueue } from "@matcha/queue";
import { startDlqMonitor, stopDlqMonitor } from "./consumers/dlqMonitor";
import { queueLengthGauge, workerRegistry } from "./config/metrics";

const server = http.createServer(async (req, res) => {
  if (req.url === '/metrics' && req.method === 'GET') {
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.PROMETHEUS_TOKEN;
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      res.writeHead(401);
      return res.end("Unauthorized")
    }
    try {
      res.writeHead(200, { 'Content-Type': workerRegistry.contentType });
      const metrics = await workerRegistry.metrics();
      return res.end(metrics);
    } catch (err: any) {
      res.writeHead(500);
      return res.end(err.message);
    }
  }
  if (req.url === '/health' && req.method === 'GET') {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const redisPing = await workerConnection.ping();
      const managerRedisPing = await pingRedisConnections()
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

let queueMetricsInterval: NodeJS.Timeout;

async function bootstrap() {
  logger.info("Starting Matcha Worker Node.");
  const PORT = process.env.WORKER_SERVER_PORT || 3002;
  server.listen(PORT, () => {
    logger.info(`Worker Health Check server listening on port ${PORT}`);
  });

  logger.info(`Task Worker listening on ${taskWorker.name}`);
  logger.info(`DB Buffer Worker listening on ${dbBufferWorker.name}`);
  logger.info(`Cron Worker listening on ${cronWorker.name}`);

  startDlqMonitor();

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
  
  queueMetricsInterval = setInterval(async () => {
    const queues = [taskQueue, dbBufferQueue, cronQueue, dlqQueue];
    for (const queue of queues) {
      try {
        const counts = await queue.getJobCounts('waiting', 'active', 'delayed', 'failed');
        queueLengthGauge.labels(queue.name, 'waiting').set(counts.waiting ?? 0);
        queueLengthGauge.labels(queue.name, 'active').set(counts.active ?? 0);
        queueLengthGauge.labels(queue.name, 'delayed').set(counts.delayed ?? 0);
        queueLengthGauge.labels(queue.name, 'failed').set(counts.failed ?? 0);
      } catch (_e) {
        // Ignored intentionally
      }
    }
  }, 15000);
  logger.info("All background services are up and running!");
}

let isShuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`Received ${signal}, shutting down workers gracefully...`);
  if (queueMetricsInterval) {
    clearInterval(queueMetricsInterval);
  }
  stopMatchmakingLoop();
  await stopDlqMonitor();
  
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
  server.close();
  try {
    await workerConnection.quit();
    await closeRedisConnections();
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

process.on('uncaughtException', (err: any) => {
  if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
    logger.debug({ code: err.code }, "Intercepted unhandled stream error (Redis drop). App continuing.");
    return;
  }
  logger.fatal({ err }, "Uncaught Exception");
  process.exit(1);
});

bootstrap().catch((err: any) => {
  logger.error({ err }, "Failed to bootstrap worker node:");
  process.exit(1);
});