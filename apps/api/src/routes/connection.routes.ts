import { Router } from "express";
import passport from "passport";
import { authGuard } from "../middleware/authGuard";
import { profileGuard } from "../middleware/profileGuard";
const connectionRouter: Router = Router();
const auth = passport.authenticate("jwt",{session:false});

connectionRouter.post(
    "/queue/join",
    auth,
    authGuard,
    profileGuard,
);
connectionRouter.post(
    "/queue/leave",
    auth,
    authGuard,
    profileGuard,
);
connectionRouter.patch(
    "/:connectionId/extend",
    auth,
    authGuard,
    profileGuard,
);
connectionRouter.patch(
    "/:connectionId/convert", 
    auth, 
    authGuard, 
    profileGuard,
);
connectionRouter.delete(
    "/:connectionId", 
    auth, 
    authGuard, 
    profileGuard,
);
export default connectionRouter;