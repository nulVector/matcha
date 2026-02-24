import { Router } from "express";
import passport from "passport";
import { authGuard } from "../middleware/authGuard";
import { profileGuard } from "../middleware/profileGuard";

const messageRouter: Router = Router();
const auth = passport.authenticate("jwt",{session:false});

messageRouter.get(
  "/unread",
  auth,
  authGuard,
  profileGuard,
);
messageRouter.get(
  "/:connectionId",
  auth,
  authGuard,
  profileGuard,
)

export default messageRouter;