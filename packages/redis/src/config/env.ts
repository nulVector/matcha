import { serverEnvSchema } from "@matcha/env";

export const env = serverEnvSchema.pick({
  REDIS_URL: true,
}).parse(process.env);