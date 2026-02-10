import dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import passport from "passport";
import { configurePassport } from "./config/passport";
import mainRouter from "./routes/index";
const app = express();
const PORT = process.env.PORT || 3001;
app.use(cookieParser());
app.use(express.json());
app.use(cors({
    credentials:true,
    origin:"http://localhost:5173"
}))
app.use(passport.initialize());
configurePassport(passport);

app.use("/api/v1",mainRouter);

app.listen(PORT, () => {
  console.log(`HTTP Backend running on port ${PORT}`);
});