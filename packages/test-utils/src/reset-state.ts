import { beforeAll, beforeEach, inject } from 'vitest';
import type { PrismaClient } from '@matcha/prisma';
import type { 
  RedisClient, 
  MatchManager, 
  BloomFilterManager 
} from '@matcha/redis';

let prisma: PrismaClient;
let testRedisClient: RedisClient;
let matchManager: MatchManager;
let bloomManager: BloomFilterManager;

beforeAll(async () => {
  const dbUrl = inject('databaseUrl');
  const redisUrl = inject('redisUrl');
  process.env.DATABASE_URL = dbUrl;
  process.env.REDIS_URL = redisUrl;
  const { default: prismaClient } = await import('@matcha/prisma');
  const { 
    createRedisClient, 
    MatchManager: MatchMgr, 
    BloomFilterManager: BloomMgr 
  } = await import('@matcha/redis');
  
  prisma = prismaClient as unknown as PrismaClient;
  testRedisClient = createRedisClient(redisUrl, "SYSTEM");
  matchManager = new MatchMgr(testRedisClient);
  bloomManager = new BloomMgr(testRedisClient);
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

  await testRedisClient.flushall();
  await matchManager.createIndex();
  await bloomManager.reserve('bf:usernames', 0.001, 100000);
  await bloomManager.reserve('bf:matches', 0.01, 5000000);
});