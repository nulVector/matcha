import dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import passport from "passport";
import { configurePassport } from "./config/passport";
import mainRouter from "./routes/index";
import { redisManager } from "./services/redis";
const app = express();
const PORT = process.env.PORT || 3001;
app.use(cookieParser());
app.use(express.json());
app.use(cors({
    credentials:true,
    origin:process.env.CLIENT_URL || "http://localhost:5173"
}))
app.use(passport.initialize());
configurePassport(passport);

app.use("/api/v1",mainRouter);

async function bootstrap() {
  try {
    await redisManager.match.createIndex();
    await redisManager.bloom.reserve('bf:usernames', 0.001, 100000);
    await redisManager.bloom.reserve('bf:matches', 0.01, 5000000);

    app.listen(PORT, () => {
      console.log(`HTTP Backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}
bootstrap();