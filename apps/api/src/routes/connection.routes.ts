import { Router } from "express";
import { authGuard } from "../middleware/authGuard";
import { profileGuard } from "../middleware/profileGuard";
import { requireAuth } from "../middleware/requireAuth";
const connectionRouter: Router = Router();

connectionRouter.use(requireAuth,authGuard,profileGuard);
connectionRouter.post(
    "/queue/join",
);
connectionRouter.post(
    "/queue/leave",
);
connectionRouter.patch(
    "/:connectionId/extend",
);
connectionRouter.patch(
    "/:connectionId/convert",
);
connectionRouter.delete(
    "/:connectionId",
);
export default connectionRouter;