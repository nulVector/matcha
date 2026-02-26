import { connectionIdSchema, deactivatePasswordSchema, getConnectionsListSchema, getFriendRequestsSchema, initiateProfileSchema, requestHandleSchema, requestIdSchema, sendRequestSchema, updatePasswordSchema, updateProfileSchema, userIdSchema, usernameCheckSchema, vibeCheck } from "@matcha/zod";
import { Router } from "express";
import { cancelRequest, checkUsername, deactivateProfile, deleteConnection, generateUsername, getConnectionsList, getFriendRequests, getMetadata, getProfile, getUserProfile, handleRequest, handleUnfriendRequest, initiateProfile, searchUser, seedDB, sendRequest, updatePassword, updateProfile } from "../controllers/user.controller";
import { authGuard } from "../middleware/authGuard";
import { idempotencyGuard } from "../middleware/idempotency";
import { profileGuard } from "../middleware/profileGuard";
import { rateLimiter } from "../middleware/rateLimiter";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
const userRouter: Router = Router();

//TODO - remove this before deploy
userRouter.post(
  "/seed",
  seedDB
);

userRouter.use(requireAuth,authGuard);
userRouter.get(
  "/check-username",
  rateLimiter('check-username', 'user', 15, 60),
  validate(usernameCheckSchema,"query"),
  checkUsername
);
userRouter.get(
  "/generate-username",
  rateLimiter('generate-username', 'user', 10, 60),
  validate(vibeCheck,"query"),
  generateUsername
);
userRouter.post(
  "/onboarding",
  idempotencyGuard('onboarding', 60),
  validate(initiateProfileSchema),
  initiateProfile
);
userRouter.get(
  "/get-metadata",
  getMetadata
);

userRouter.use(profileGuard);
userRouter.get(
  "/me",
  getProfile
);
userRouter.patch(
  "/me/profile",
  validate(updateProfileSchema),
  updateProfile
);
userRouter.patch(
  "/me/update-password",
  rateLimiter('update-password', 'user', 5, 60 * 15),
  idempotencyGuard('update-password', 15),
  validate(updatePasswordSchema),
  updatePassword
);
userRouter.delete(
  "/me/deactivate-profile",
  rateLimiter('deactivate-profile', 'user', 3, 15 * 60),
  idempotencyGuard('deactivate-profile', 15),
  validate(deactivatePasswordSchema),
  deactivateProfile
);
userRouter.get(
  "/me/connections",
  validate(getConnectionsListSchema,"query"),
  getConnectionsList
);
userRouter.patch(
  "/me/connections/:connectionId",
  rateLimiter('delete-connection', 'user', 20, 60),
  idempotencyGuard('delete-connection', 5),
  validate(connectionIdSchema,"params"),
  deleteConnection
);
userRouter.get(
  "/me/requests",
  validate(getFriendRequestsSchema,"query"),
  getFriendRequests
);
userRouter.get(
  "/search",
  rateLimiter('search', 'user', 40, 60),
  validate(usernameCheckSchema,"query"),
  searchUser
);
userRouter.get(
  "/:username",
  rateLimiter('get-user', 'user', 60, 60),
  validate(usernameCheckSchema,"params"),
  getUserProfile
);
userRouter.post(
  "/:userId/request",
  rateLimiter('send-request', 'user', 20, 60),
  idempotencyGuard('send-request', 30),
  validate(userIdSchema,"params"),
  validate(sendRequestSchema),
  sendRequest
);
userRouter.delete(
  "/:requestId/cancel",
  rateLimiter('cancel-request', 'user', 20, 60),
  idempotencyGuard('cancel-request', 30),
  validate(requestIdSchema,"params"),
  cancelRequest
);
userRouter.post(
  "/:requestId/handle-request", 
  rateLimiter('handle-request', 'user', 30, 60),
  idempotencyGuard('handle-request', 30), 
  validate(requestIdSchema,"params"),
  validate(requestHandleSchema),
  handleRequest
);
userRouter.patch(
  "/:userId/unfriend",
  rateLimiter('unfriend', 'user', 20, 60),
  idempotencyGuard('unfriend', 5),
  validate(userIdSchema,"params"),
  handleUnfriendRequest
);
export default userRouter;