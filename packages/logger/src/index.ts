import { pino, LoggerOptions } from "pino";
import { AsyncLocalStorage } from "async_hooks";
import { serverEnvSchema } from "@matcha/env";

const env = serverEnvSchema.pick({
  NODE_ENV: true,
  LOG_LEVEL: true,
}).parse(process.env);

export const traceStorage = new AsyncLocalStorage<{ traceId: string }>();

const isDev = env.NODE_ENV !== "production";

const options: LoggerOptions = {
  level: env.LOG_LEVEL,
  mixin() {
    const store = traceStorage.getStore();
    return store?.traceId ? { traceId: store.traceId } : {};
  },
  redact: {
    paths: ["req.headers.cookie", "req.headers.authorization", "req.headers['x-device-id']"],
    censor: "[REDACTED]"
  },
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard", 
        ignore: "pid,hostname", 
      },
    },
  }),
};

export const logger = pino(options);