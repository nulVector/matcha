import {CategorySchema} from '@matcha/zod'
import { Router } from "express";
import passport from "passport";
import { authGuard } from "../middleware/authGuard";
import { profileGuard } from "../middleware/profileGuard";
import { getNotification, markNotificationRead } from "../controllers/notification.controller";
import { validate } from "../middleware/validate";

const notificationRouter: Router = Router();
const auth = passport.authenticate("jwt",{session:false});

notificationRouter.get(
    "/",
    auth,
    authGuard,
    profileGuard,
    getNotification
)
notificationRouter.patch(
    "/:category/read",
    auth,
    authGuard,
    profileGuard,
    validate(CategorySchema),
    markNotificationRead
)

export default notificationRouter;