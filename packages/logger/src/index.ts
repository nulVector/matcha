import { pino, LoggerOptions } from "pino";

const isDev = process.env.NODE_ENV !== "production";

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL || "info",
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

export default logger;