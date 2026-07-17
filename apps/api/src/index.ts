import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import express from "express";
import passport from "passport";
import pinoHttp from "pino-http";
import type { Server } from 'http';
import { logger } from "@matcha/logger";
import { configurePassport } from "./config/passport";
import mainRouter from "./routes/index";
import { serverAdapter, adminAuth } from "./config/bullboard";
import { checkHealth } from "./controllers/health.controller";
import prisma from "@matcha/prisma";
import { bloomManager, closeRedisConnections, matchManager } from "./services/redis";
import { traceMiddleware } from "./middleware/trace";
import { metricsAuth, metricsMiddleware } from "./middleware/metrics";
import { getMetrics } from "./controllers/metrics.controller";

const app = express();
const PORT = Number(process.env.API_PORT) || 3001;
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"], 
    },
  },
}));
app.set('trust proxy', 1);
app.use(cookieParser());
app.use(express.json());
app.use(traceMiddleware);
app.use(metricsMiddleware);

const allowedOrigins = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : ["http://localhost:3000"];
app.use(cors({
    credentials:true,
    origin:(origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn({ origin }, "Blocked by CORS");
            callback(new Error('Not allowed by CORS'));
        }
    }
}))

app.use(pinoHttp({
  logger,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
      headers: {
        'user-agent': req.headers['user-agent'],
        'origin': req.headers['origin'],
        'referer': req.headers['referer']
      }
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    })
  },
  autoLogging: process.env.ARTILLERY_TEST === 'true' ? false : {
    ignore: (req) => req.url === '/health' || req.url === '/metrics'
  }
}));
app.use(passport.initialize());
configurePassport(passport);
app.get('/metrics', metricsAuth, getMetrics);
app.use('/admin/queues/dashboard', adminAuth, serverAdapter.getRouter());
app.get('/health', checkHealth);
app.use("/api/v1",mainRouter);

let server: Server;
async function bootstrap() {
  try {
    await matchManager.createIndex();
    await bloomManager.reserve('bf:usernames', 0.001, 100000);
    await bloomManager.reserve('bf:matches', 0.01, 5000000);
    
    server = app.listen(PORT, '0.0.0.0', 8192, () => {
      logger.info(`API listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1)
  }
}
bootstrap();

let isShuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`Received ${signal}, shutting down API gracefully...`);
  setTimeout(() => {
    logger.error("Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 10000);
  if (server) {
    server.close(async () => {
      logger.info("HTTP server closed. Disconnecting databases...");
      try {
        await closeRedisConnections();
        await prisma.$disconnect();
        logger.info("API graceful shutdown complete.");
        process.exit(0);
      } catch (err) {
        logger.error({ err }, "Error during database disconnection");
        process.exit(1); 
      }
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception detected. Initiating graceful shutdown.');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (err) => {
  logger.fatal({ err }, 'Unhandled Promise Rejection detected. Initiating graceful shutdown.');
  gracefulShutdown('unhandledRejection');
});