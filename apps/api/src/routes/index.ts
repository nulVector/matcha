import { Router } from "express";
import authRouter from "./auth.routes";
import connectionRouter from "./connection.routes";
import messageRouter from "./message.routes";
import userRouter from "./user.routes";
import { globalErrorHandler } from "../middleware/errorHandler";
import notificationRouter from "./notifcation.routes";
import { requireAuth } from "../middleware/requireAuth";
import { authGuard } from "../middleware/authGuard";
import { slidingSession } from "../middleware/slidingSession";
import { profileGuard } from "../middleware/profileGuard";
const mainRouter: Router = Router();

mainRouter.use("/auth", authRouter);

mainRouter.use(requireAuth,authGuard,slidingSession);
mainRouter.use("/users", userRouter);

mainRouter.use(profileGuard);
mainRouter.use("/connections", connectionRouter);
mainRouter.use("/messages", messageRouter);
mainRouter.use("/notifications", notificationRouter);

mainRouter.use(globalErrorHandler)
export default mainRouter;