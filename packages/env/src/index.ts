import { z } from "zod";

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  ARTILLERY_TEST: z.enum(["true", "false"]).default("false"),
  API_PORT: z.coerce.number().default(3001),
  WS_PORT: z.coerce.number().default(8080),
  WORKER_SERVER_PORT: z.coerce.number().default(3002),
  API_URL: z.url(),
  CLIENT_URL: z.string().refine((val) => val.split(',').every(url => {
    try { 
      new URL(url.trim()); 
      return true; 
    } catch { return false; }
  }), { message: "Must be a valid URL or comma-separated URLs" }),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, "Must be a valid Postgres connection string"),
  REDIS_URL: z.url().startsWith("redis://"),
  DATABASE_POOL_SIZE: z.coerce.number().default(15),
  JWT_SECRET: z.string().min(8, "JWT secret must be at least 8 characters long"),
  PROMETHEUS_TOKEN: z.string().min(1, "Prometheus token is required"),
  GOOGLE_CLIENT_ID: z.string().min(1, "Google Client ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "Google Client Secret is required"),
  ADMIN_USERNAME: z.string().min(1, "Admin username is required"),
  ADMIN_PASSWORD: z.string().min(8, "Admin password must be at least 8 characters"),
  RESEND_API_KEY: z.string().min(1, "Resend API key is required"),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
  NEXT_PUBLIC_WS_URL: z.url(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;