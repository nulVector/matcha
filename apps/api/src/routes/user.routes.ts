import { connectionIdSchema, deactivatePasswordSchema, getConnectionsListSchema, getFriendRequestsSchema, initiateProfileSchema, requestHandleSchema, requestIdSchema, sendRequestSchema, updatePasswordSchema, updateProfileSchema, userIdSchema, usernameCheckSchema, vibeCheck } from "@matcha/zod";
import { Router } from "express";
import passport from "passport";
import { cancelRequest, checkUsername, deactivateProfile, deleteConnection, generateUsername, getConnectionsList, getFriendRequests, getMetadata, getProfile, getUserProfile, handleRequest, handleUnfriendRequest, initiateProfile, searchUser, seedDB, sendRequest, updatePassword, updateProfile } from "../controllers/user.controller";
import { authGuard } from "../middleware/authGuard";
import { profileGuard } from "../middleware/profileGuard";
import { validate } from "../middleware/validate";
import { rateLimiter } from "../middleware/rateLimiter";
import { idempotencyGuard } from "../middleware/idempotency";
const userRouter: Router = Router();

const auth = passport.authenticate("jwt", {session:false});
//TODO - remove this before deploy
userRouter.post(
  "/seed",
  seedDB
);

userRouter.get(
  "/check-username",
  auth,
  authGuard,
  rateLimiter('check-username', 'user', 15, 60),
  validate(usernameCheckSchema,"query"),
  checkUsername
);
userRouter.get(
  "/generate-username",
  auth,
  authGuard,
  rateLimiter('generate-username', 'user', 10, 60),
  validate(vibeCheck,"query"),
  generateUsername
);
userRouter.post(
  "/onboarding",
  auth,
  authGuard,
  idempotencyGuard('onboarding', 60),
  validate(initiateProfileSchema),
  initiateProfile
);
userRouter.get(
  "/get-metadata",
  auth,
  authGuard,
  getMetadata
);
userRouter.get(
  "/me",
  auth,
  authGuard,
  profileGuard,
  getProfile
);
userRouter.patch(
  "/me/profile",
  auth,
  authGuard,
  profileGuard,
  validate(updateProfileSchema),
  updateProfile
);
userRouter.patch(
  "/me/update-password",
  auth,
  authGuard,
  profileGuard,
  rateLimiter('update-password', 'user', 5, 60 * 15),
  idempotencyGuard('update-password', 15),
  validate(updatePasswordSchema),
  updatePassword
);
userRouter.delete(
  "/me/deactivate-profile",
  auth,
  authGuard,
  profileGuard,
  rateLimiter('deactivate-profile', 'user', 3, 15 * 60),
  idempotencyGuard('deactivate-profile', 15),
  validate(deactivatePasswordSchema),
  deactivateProfile
);
userRouter.get(
  "/me/connections",
  auth,
  authGuard,
  profileGuard,
  validate(getConnectionsListSchema,"query"),
  getConnectionsList
);
userRouter.patch(
  "/me/connections/:connectionId",
  auth,
  authGuard,
  profileGuard,
  rateLimiter('delete-connection', 'user', 20, 60),
  idempotencyGuard('delete-connection', 5),
  validate(connectionIdSchema,"params"),
  deleteConnection
);
userRouter.get(
  "/me/requests",
  auth,
  authGuard,
  profileGuard,
  validate(getFriendRequestsSchema,"query"),
  getFriendRequests
);
userRouter.get(
  "/search",
  auth,
  authGuard,
  profileGuard,
  rateLimiter('search', 'user', 40, 60),
  validate(usernameCheckSchema,"query"),
  searchUser
);
userRouter.get(
  "/:username",
  auth,
  authGuard,
  profileGuard,
  rateLimiter('get-user', 'user', 60, 60),
  validate(usernameCheckSchema,"params"),
  getUserProfile
);
userRouter.post(
  "/:userId/request",
  auth,
  authGuard,
  profileGuard,
  rateLimiter('send-request', 'user', 20, 60),
  idempotencyGuard('send-request', 30),
  validate(userIdSchema,"params"),
  validate(sendRequestSchema),
  sendRequest
);
userRouter.delete(
  "/:requestId/cancel",
  auth,
  authGuard,
  profileGuard,
  rateLimiter('cancel-request', 'user', 20, 60),
  idempotencyGuard('cancel-request', 30),
  validate(requestIdSchema,"params"),
  cancelRequest
);
userRouter.post(
  "/:requestId/handle-request",
  auth,
  authGuard, 
  profileGuard,
  rateLimiter('handle-request', 'user', 30, 60),
  idempotencyGuard('handle-request', 30), 
  validate(requestIdSchema,"params"),
  validate(requestHandleSchema),
  handleRequest
);
userRouter.patch(
  "/:userId/unfriend",
  auth,
  authGuard,
  profileGuard,
  rateLimiter('unfriend', 'user', 20, 60),
  idempotencyGuard('unfriend', 5),
  validate(userIdSchema,"params"),
  handleUnfriendRequest
);
export default userRouter;