import { connectionIdSchema, getChatHistorySchema } from "@matcha/zod";
import { Router } from "express";
import { getChatHistory, getUnreadCounts } from "../controllers/message.controller";
import { validate } from "../middleware/validate";

const messageRouter: Router = Router();

messageRouter.get(
  "/unread",
  getUnreadCounts
);
messageRouter.get(
  "/:connectionId",
  validate(connectionIdSchema,"params"),
  validate(getChatHistorySchema,"query"),
  getChatHistory
)

export default messageRouter;