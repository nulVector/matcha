import { loginSchema, requestPasswordResetSchema, resetPasswordSchema, signupSchema } from "@matcha/zod";
import { Router } from "express";
import { confirmResetPassword, login, logout, requestResetPassword, signup } from "../controllers/auth.controller";
import { idempotencyGuard } from "../middleware/idempotency";
import { rateLimiter } from "../middleware/rateLimiter";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
const authRouter: Router = Router();

authRouter.post(
    "/signup",
    rateLimiter('signup', 'ip', 100, 60*15),
    rateLimiter('signup', 'device', 3, 60*60*24),
    idempotencyGuard('signup', 60*60*24),
    validate(signupSchema),
    signup
);
authRouter.post(
    "/login",
    validate(loginSchema),
    rateLimiter('login', 'email', 10, 60*15),
    login
);
authRouter.post(
    "/request-password-reset",
    validate(requestPasswordResetSchema),
    rateLimiter('req_reset', 'ip', 10, 60*15),
    rateLimiter('req_reset', 'email', 3, 60*15),
    requestResetPassword
);
authRouter.post(
    "/confirm-password-reset",
    rateLimiter('confirm_reset', 'ip', 10, 60*15),
    validate(resetPasswordSchema),
    confirmResetPassword
);
authRouter.post(
    "/logout",
    requireAuth,
    logout
);

export default authRouter;