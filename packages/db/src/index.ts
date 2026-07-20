import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { env } from "./env";

const pool = new pg.Pool({ 
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_SIZE,
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

if (env.NODE_ENV !== 'production') globalThis.prisma = prisma;

export * from "./generated/prisma/client";
export * from "./generated/prisma/enums";
export default prisma;