import { connectionIdSchema, deactivatePasswordSchema, getConnectionsListSchema, getFriendRequestsSchema, initiateProfileSchema, requestHandleSchema, requestIdSchema, sendRequestSchema, updateAvatarSchema, updateDiscoverySchema, updatePasswordSchema, updateProfileSchema, userIdSchema, usernameCheckSchema } from "@matcha/zod";
import { Router } from "express";
import passport from "passport";
import { cancelRequest, checkUsername, deactivateProfile, deleteConnection, generateUsername, getConnectionsList, getFriendRequests, getMetadata, getProfile, getUserProfile, handleRequest, handleUnfriendRequest, initiateProfile, searchUser, seedDB, sendRequest, updateAvatar, updateDiscovery, updatePassword, updateProfile } from "../controllers/user.controller";
import { authGuard } from "../middleware/authGuard";
import { profileGuard } from "../middleware/profileGuard";
import { validate } from "../middleware/validate";
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
  validate(usernameCheckSchema,"query"),
  checkUsername
);
userRouter.get(
  "/generate-username",
  auth,
  authGuard,
  generateUsername
);
userRouter.post(
  "/onboarding/username",
  auth,
  authGuard,
  validate(initiateProfileSchema),
  initiateProfile
);
userRouter.get(
  "/get-metadata",
  auth,
  authGuard,
  getMetadata
);
userRouter.patch(
  "/onboarding/details",
  auth,
  authGuard,
  profileGuard,
  validate(updateProfileSchema),
  updateProfile
);
userRouter.get(
  "/me",
  auth,
  authGuard,
  profileGuard,
  getProfile
);
userRouter.patch(
  "/me/avatar",
  auth,
  authGuard,
  profileGuard,
  validate(updateAvatarSchema),
  updateAvatar
);
userRouter.patch(
  "/me/discovery",
  auth,
  authGuard,
  profileGuard,
  validate(updateDiscoverySchema),
  updateDiscovery
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
  validate(updatePasswordSchema),
  updatePassword
);
userRouter.delete(
  "/me/deactivate-profile",
  auth,
  authGuard,
  profileGuard,
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
  validate(usernameCheckSchema,"query"),
  searchUser
);
userRouter.get(
  "/:username",
  auth,
  authGuard,
  profileGuard,
  validate(usernameCheckSchema,"params"),
  getUserProfile
);
userRouter.post(
  "/:userId/request",
  auth,
  authGuard,
  profileGuard,
  validate(userIdSchema,"params"),
  validate(sendRequestSchema),
  sendRequest
);
userRouter.delete(
  "/:requestId/cancel",
  auth,
  authGuard,
  profileGuard,
  validate(requestIdSchema,"params"),
  cancelRequest
);
userRouter.post(
  "/:requestId/handle-request",
  auth,
  authGuard, 
  profileGuard,
  validate(requestIdSchema,"params"),
  validate(requestHandleSchema),
  handleRequest
);
userRouter.patch(
  "/:userId/unfriend",
  auth,
  authGuard,
  profileGuard,
  validate(userIdSchema,"params"),
  handleUnfriendRequest
);
export default userRouter;
//TODO - block
//TODO - get avatar
//TODO - final delete of chats based on timing -> cron job
//TODO - unfriend check when loading chats