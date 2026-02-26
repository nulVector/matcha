import {CategorySchema} from '@matcha/zod'
import { Router } from "express";
import { authGuard } from "../middleware/authGuard";
import { profileGuard } from "../middleware/profileGuard";
import { getNotification, markNotificationRead } from "../controllers/notification.controller";
import { validate } from "../middleware/validate";
import { requireAuth } from '../middleware/requireAuth';

const notificationRouter: Router = Router();
notificationRouter.use(requireAuth,authGuard,profileGuard);
notificationRouter.get(
    "/",
    getNotification
)
notificationRouter.patch(
    "/:category/read",
    validate(CategorySchema,"params"),
    markNotificationRead
)

export default notificationRouter;