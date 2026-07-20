import { serverEnvSchema, type ServerEnv } from '@matcha/env';

const dbEnvSchema = serverEnvSchema.pick({
  DATABASE_URL: true,
  DATABASE_POOL_SIZE: true,
  NODE_ENV: true,
});

const isStaticAnalysis = 
  process.env.npm_lifecycle_event === "lint" || 
  process.env.npm_lifecycle_event === "build";

export const env = isStaticAnalysis
  ? (process.env as unknown as Pick<ServerEnv, 'DATABASE_URL' | 'DATABASE_POOL_SIZE' | 'NODE_ENV'>)
  : dbEnvSchema.parse(process.env);