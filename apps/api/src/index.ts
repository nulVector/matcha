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

async function bootstrap() {
  try {
    await redisManager.match.createIndex();
    await redisManager.bloom.reserve('bf:usernames', 0.001, 100000);
    await redisManager.bloom.reserve('bf:matches', 0.01, 5000000);

    app.listen(PORT, () => {
      logger.info(`HTTP Backend running on port ${PORT}`);
    });
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1)
  }
}
bootstrap();