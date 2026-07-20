import { serverEnvSchema } from "@matcha/env";

export const env = serverEnvSchema.parse(process.env);