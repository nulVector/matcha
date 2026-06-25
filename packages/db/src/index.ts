import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing from environment variables!");
}

const poolSize = process.env.DATABASE_POOL_SIZE 
  ? parseInt(process.env.DATABASE_POOL_SIZE, 10) 
  : 10;

const pool = new pg.Pool({ 
  connectionString,
  max: poolSize,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const adapter = new PrismaPg(pool);

export const getDbMetrics = () => {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    active: pool.totalCount - pool.idleCount,
  };
};

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter });
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

export * from "./generated/prisma/client";
export * from "./generated/prisma/enums";
export default prisma;