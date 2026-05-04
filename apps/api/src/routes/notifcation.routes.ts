import {CategorySchema} from '@matcha/zod'
import { Router } from "express";
import { getNotification, markNotificationRead } from "../controllers/notification.controller";
import { validate } from "../middleware/validate";
const notificationRouter: Router = Router();

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