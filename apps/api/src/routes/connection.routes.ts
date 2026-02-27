import { Router } from "express";
import { convertConnection, extendTimer, joinQueue, leaveQueue, skipConnection } from "../controllers/connection.controller";
import { authGuard } from "../middleware/authGuard";
import { profileGuard } from "../middleware/profileGuard";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import { connectionIdSchema } from "@matcha/zod";
import { rateLimiter } from "../middleware/rateLimiter";
import { idempotencyGuard } from "../middleware/idempotency";
const connectionRouter: Router = Router();

connectionRouter.use(requireAuth,authGuard,profileGuard);
connectionRouter.post(
  "/queue/join",
  rateLimiter("join_queue", "user", 5, 10),
  idempotencyGuard("join_queue", 30),
  joinQueue
);
connectionRouter.post(
  "/queue/leave",
  rateLimiter("leave_queue", "user", 5, 10),
  idempotencyGuard("leave_queue", 30),
  leaveQueue
);
connectionRouter.patch(
  "/:connectionId/extend",
  rateLimiter("extend_timer", "user", 3, 10),
  idempotencyGuard("extend_timer", 30),
  validate(connectionIdSchema,"params"),
  extendTimer
);
connectionRouter.patch(
  "/:connectionId/convert",
  rateLimiter("convert_connection", "user", 3, 10),
  idempotencyGuard("convert_connection", 30),
  validate(connectionIdSchema,"params"),
  convertConnection
);
connectionRouter.delete(
  "/:connectionId",
  rateLimiter("skip_connection", "user", 3, 10),
  idempotencyGuard("skip_connection", 30),
  validate(connectionIdSchema,"params"),
  skipConnection
);
export default connectionRouter;