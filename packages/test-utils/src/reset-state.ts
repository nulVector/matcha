import { beforeAll, beforeEach, inject } from 'vitest';
import Redis from 'ioredis';
import type { PrismaClient } from '@matcha/prisma';
import type { RedisManager } from '@matcha/redis';

let prisma: PrismaClient;
let testRedisManager: RedisManager;
let rawRedisClient: Redis;

beforeAll(async () => {
  const dbUrl = inject('databaseUrl');
  const redisUrl = inject('redisUrl');
  process.env.DATABASE_URL = dbUrl;
  process.env.REDIS_URL = redisUrl;
  const { default: prismaClient } = await import('@matcha/prisma');
  const { RedisManager: Manager } = await import('@matcha/redis');
  prisma = prismaClient as unknown as PrismaClient;
  testRedisManager = new Manager(redisUrl);
  rawRedisClient = new Redis(redisUrl);
});

beforeEach(async () => {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;
  const ignoreList = ['_prisma_migrations', 'Avatar', 'Location', 'Interest'];
  for (const { tablename } of tables) {
    if (!ignoreList.includes(tablename)) {
      await prisma.$queryRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }
  }

  await rawRedisClient.flushall();
  await testRedisManager.match.createIndex();
  await testRedisManager.bloom.reserve('bf:usernames', 0.001, 100000);
  await testRedisManager.bloom.reserve('bf:matches', 0.01, 5000000);
});