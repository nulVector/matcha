import { taskWorker } from "./consumers/taskConsumer";
import { dbBufferWorker } from "./consumers/dbBufferConsumer";
import { cronWorker } from "./consumers/cronConsumer";
import { startMatchmakingLoop, stopMatchmakingLoop } from "./consumers/matchConsumer";
import { workerConnection, redisManager } from "./config/redis";
import prisma from "@matcha/prisma";

async function bootstrap() {
  console.log("Starting Matcha Worker Node.");
  console.log(`Task Worker listening on ${taskWorker.name}`);
  console.log(`DB Buffer Worker listening on ${dbBufferWorker.name}`);
  console.log(`Cron Worker listening on ${cronWorker.name}`);
  console.log(`Initializing Matchmaking Consumer...`);
  startMatchmakingLoop().catch((err) => {
    console.error("Native Matchmaking Loop crashed:", err);
  });
  console.log("All background services are up and running!");
}
bootstrap().catch((err) => {
  console.error("Failed to bootstrap worker node:", err);
  process.exit(1);
});