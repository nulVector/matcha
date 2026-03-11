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
const app = express();
const PORT = process.env.PORT || 3001;
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(cors({
    credentials:true,
    origin:process.env.CLIENT_URL || "http://localhost:5173"
}))
app.use(pinoHttp({
  logger,
  autoLogging: {
    //TODO: implement health check
    ignore: (req) => req.url === '/health'
  }
}));
app.use(passport.initialize());
configurePassport(passport);

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