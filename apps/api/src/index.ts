import dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import express from "express";
import passport from "passport";
import pinoHttp from "pino-http";
import { logger } from "@matcha/logger";
import { configurePassport } from "./config/passport";
import mainRouter from "./routes/index";
import { redisManager } from "./services/redis";
import { serverAdapter, adminAuth } from "./config/bullboard";
import { checkHealth } from "./controllers/health.controller";
import prisma from "@matcha/prisma";

const app = express();
const PORT = process.env.PORT || 3001;
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
app.use(cookieParser());
app.use(express.json());

const allowedOrigins = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : ["http://localhost:5173"];
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
  autoLogging: {
    ignore: (req) => req.url === '/health'
  }
}));
app.use(passport.initialize());
configurePassport(passport);
app.use('/admin/queues/dashboard', adminAuth, serverAdapter.getRouter());
app.get('/health', checkHealth);
app.use("/api/v1",mainRouter);

let server: any;
async function bootstrap() {
  try {
    await redisManager.match.createIndex();
    await redisManager.bloom.reserve('bf:usernames', 0.001, 100000);
    await redisManager.bloom.reserve('bf:matches', 0.01, 5000000);

    server = app.listen(PORT, () => {
      logger.info(`HTTP Backend running on port ${PORT}`);
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
        await redisManager.quit();
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