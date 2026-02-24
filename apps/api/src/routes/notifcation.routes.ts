import {CategorySchema} from '@matcha/zod'
import { Router } from "express";
import { authGuard } from "../middleware/authGuard";
import { profileGuard } from "../middleware/profileGuard";
import { getNotification, markNotificationRead } from "../controllers/notification.controller";
import { validate } from "../middleware/validate";
import { requireAuth } from '../middleware/requireAuth';

const notificationRouter: Router = Router();

notificationRouter.get(
    "/",
    requireAuth,
    authGuard,
    profileGuard,
    getNotification
)
notificationRouter.patch(
    "/:category/read",
    requireAuth,
    authGuard,
    profileGuard,
    validate(CategorySchema),
    markNotificationRead
)

export default notificationRouter;