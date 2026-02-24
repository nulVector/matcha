import { Router } from "express";
import { authGuard } from "../middleware/authGuard";
import { profileGuard } from "../middleware/profileGuard";
import { requireAuth } from "../middleware/requireAuth";
const connectionRouter: Router = Router();

connectionRouter.post(
    "/queue/join",
    requireAuth,
    authGuard,
    profileGuard,
);
connectionRouter.post(
    "/queue/leave",
    requireAuth,
    authGuard,
    profileGuard,
);
connectionRouter.patch(
    "/:connectionId/extend",
    requireAuth,
    authGuard,
    profileGuard,
);
connectionRouter.patch(
    "/:connectionId/convert", 
    requireAuth, 
    authGuard, 
    profileGuard,
);
connectionRouter.delete(
    "/:connectionId", 
    requireAuth, 
    authGuard, 
    profileGuard,
);
export default connectionRouter;