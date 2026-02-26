import { connectionIdSchema } from "@matcha/zod";
import { Router } from "express";
import { getChatHistory, getUnreadCounts } from "../controllers/message.controller";
import { authGuard } from "../middleware/authGuard";
import { profileGuard } from "../middleware/profileGuard";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";

const messageRouter: Router = Router();

messageRouter.use(requireAuth, authGuard, profileGuard);
messageRouter.get(
  "/unread",
  getUnreadCounts
);
messageRouter.get(
  "/:connectionId",
  validate(connectionIdSchema,"params"),
  getChatHistory
)

export default messageRouter;