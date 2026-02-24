import { Router } from "express";
import { authGuard } from "../middleware/authGuard";
import { profileGuard } from "../middleware/profileGuard";
import { requireAuth } from "../middleware/requireAuth";

const messageRouter: Router = Router();

messageRouter.get(
  "/unread",
  requireAuth,
  authGuard,
  profileGuard,
);
messageRouter.get(
  "/:connectionId",
  requireAuth,
  authGuard,
  profileGuard,
)

export default messageRouter;