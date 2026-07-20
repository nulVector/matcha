import { serverEnvSchema } from "@matcha/env";

export const env = serverEnvSchema.pick({
  REDIS_URL: true,
  ARTILLERY_TEST: true
}).parse(process.env);