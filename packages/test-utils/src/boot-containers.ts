import 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer, StartedRedisContainer } from "@testcontainers/redis";
import { execSync } from "child_process";
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
    redisUrl: string;
  }
}

let pgContainer: StartedPostgreSqlContainer;
let redisContainer: StartedRedisContainer;

export default async function setup(project: TestProject) {
  console.log("Booting Testcontainers...");
  [pgContainer, redisContainer] = await Promise.all([
    new PostgreSqlContainer("postgres:15-alpine").start(),
    new RedisContainer("redis/redis-stack-server:latest").start() 
  ]);
  const testDatabaseUrl = pgContainer.getConnectionUri();
  const testRedisUrl = redisContainer.getConnectionUrl();
  console.log("Containers running");
  console.log("Pushing Prisma schema...");
  execSync("pnpm --filter @matcha/prisma exec prisma db push ", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  });
  console.log("Seeding Reference Data");
  //TODO - add seed command
  // execSync("pnpm db:seed", {
  //   stdio: "inherit",
  //   env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  // });
  project.provide('databaseUrl', testDatabaseUrl);
  project.provide('redisUrl', testRedisUrl);
  console.log("Test infrastructure is ready!");

  return async () => {
    console.log('Tearing down Testcontainers...');
    await Promise.all([pgContainer.stop(), redisContainer.stop()]);
  };
}