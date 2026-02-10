import "dotenv/config"; 
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is missing from environment variables!");
}
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
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