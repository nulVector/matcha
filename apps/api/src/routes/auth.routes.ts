import { loginSchema, requestPasswordResetSchema, resetPasswordSchema, signupSchema } from "@matcha/zod";
import { Router } from "express";
import { confirmReset, login, logout, requestReset, signup } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
const authRouter: Router = Router();
//TODO - add tokenVersion for session tracking
authRouter.post(
    "/signup",
    validate(signupSchema),
    signup
);
authRouter.post(
    "/login",
    validate(loginSchema),
    login
);
authRouter.post(
    "/request-password-reset",
    validate(requestPasswordResetSchema),
    requestReset
);
authRouter.post(
    "/confirm-password-reset",
    validate(resetPasswordSchema),
    confirmReset
);
authRouter.post(
    "/logout",
    logout
);

export default authRouter;