import { Router } from "express";
import authRouter from "./auth.routes";
import connectionRouter from "./connection.routes";
import messageRouter from "./message.routes";
import userRouter from "./user.routes";
import { globalErrorHandler } from "../middleware/errorHandler";
const mainRouter: Router = Router();

mainRouter.use("/auth", authRouter);
mainRouter.use("/users", userRouter);
mainRouter.use("/connections", connectionRouter);
mainRouter.use("/messages", messageRouter);

mainRouter.use(globalErrorHandler)
export default mainRouter;