import { NextFunction, Request, Response } from "express";
import { ConnectionListType, MatchAction, UserState } from "@matcha/redis";
import { connectionIdType, requestHandleType } from "@matcha/zod";
import prisma, { ConnectionStatus } from "@matcha/prisma";
import { EventType, SystemAction } from "@matcha/shared";
import { logger, traceStorage } from "@matcha/logger";
import { chatManager, matchManager, userConnectionManager, userDetailManager } from "../services/redis";

async function getSafeMatchInfo(connectionId: string) {
  const matchInfo = await matchManager.getMatchInfo(connectionId);
  if (matchInfo) return matchInfo;
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: { user1Id: true, user2Id: true, status: true, expiresAt: true }
  });
  if (!connection || connection.status !== ConnectionStatus.MATCHED || !connection.expiresAt) {
    return null;
  }
  await matchManager.setMatchInfo(connectionId,connection.user1Id,connection.user2Id, connection.expiresAt.toISOString());
  return {
    user1Id: connection.user1Id,
    user2Id: connection.user2Id
  };
}

export const joinQueue = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const profileId = req.user!.profile!.id;
    const cachedProfile = await userDetailManager.getProfileFields(profileId, [
      "queueStatus", "interest", "locationLatitude" ]);
    const currentStatus = cachedProfile.queueStatus || UserState.IDLE;
    if(currentStatus !== UserState.IDLE) {
      return res.status(400).json({
        success:false,
        message:"You are already in the queue or currently in a match."
      })
    }
    if (!cachedProfile.interest || cachedProfile.interest.length === 0 || cachedProfile.locationLatitude === undefined) {
      const profile = await prisma.userProfile.findUnique({
        where: { id: profileId },
        select: { locationLatitude: true, locationLongitude: true, interest: true }
      });
      if (profile) {
        await Promise.all([
          matchManager.updateMatchProfile(
            profileId,
            profile.locationLatitude,
            profile.locationLongitude,
            profile.interest
          ),
          userDetailManager.cacheProfile(profileId, {
            locationLatitude: profile.locationLatitude,
            locationLongitude: profile.locationLongitude,
            interest: profile.interest
          })
        ]);
      }
    }
    await matchManager.addToQueue(profileId);
    return res.json({
      success:true,
      message:"Successfully joined the matchmaking queue."
    })
  } catch (err: any) {
    err.context = { location: "connectionController.joinQueue", profileId: req.user!.profile!.id };
    next(err);
  }
}
export const leaveQueue = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const profileId = req.user!.profile!.id;
    await matchManager.leaveQueue(profileId, UserState.IDLE);
    return res.json({
      success:true,
      message:"Successfully left the matchmaking queue."
    })
  } catch (err: any) {
    err.context = { location: "connectionController.leaveQueue", profileId: req.user!.profile!.id };
    next(err)
  }
}
export const extendTimer = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const profileId = req.user!.profile!.id;
    const {connectionId}:connectionIdType = req.validatedData.params;
    const {action}:requestHandleType = req.validatedData.body;
    const matchInfo = await getSafeMatchInfo(connectionId);
    if (!matchInfo) {
      return res.status(400).json({
        success:false,
        message:"Chat ended."
      })
    }
    if (action === 'REJECT') {
      await matchManager.clearSpecificVote(connectionId, MatchAction.EXTEND);
      return res.json({
        success: true,
        message: "Extension declined."
      });
    }
    const traceId = traceStorage.getStore()?.traceId;
    const receiverId = matchInfo.user1Id === profileId ? matchInfo.user2Id : matchInfo.user1Id;
    const voteCount = await matchManager.recordMatchVotes(connectionId,profileId,MatchAction.EXTEND);
    if (voteCount === 1) {
      logger.info({ action: "extendTimer", connectionId }, "Processing match extension");
      await chatManager.publish(
        'chat_router',
        JSON.stringify({
          receiverId,
          eventType: EventType.SYSTEM_EVENT,
          eventData:{
            event: SystemAction.EXTEND_REQUESTED,
            senderId:profileId,
            connectionId
          },
          traceId
        })
      )
      return res.json({
        success: true,
        message: "Extension requested."
      });
    }
    if (voteCount === 2){
      const THIRTY_MINUTES_MS = 60 * 30 * 1000;
      const newExpiresAt = new Date(Date.now() + THIRTY_MINUTES_MS);
      await Promise.all([
        prisma.connection.update({
          where: { id:connectionId },
          data:{ expiresAt:newExpiresAt }
        }),
        matchManager.setMatchTimer(connectionId, 60 * 30),
        matchManager.clearSpecificVote(connectionId, MatchAction.EXTEND),
        matchManager.setMatchInfo(connectionId, profileId, receiverId, newExpiresAt.toISOString())
      ]);
      logger.info({ action: "extendTimer_success", connectionId }, "Match extended");
      const successEvent = {
        eventType: EventType.SYSTEM_EVENT,
        eventData:{
          event: SystemAction.EXTEND_ACCEPTED,
          expiresAt:newExpiresAt.toISOString(),
          connectionId
        },
        traceId
      }
      await Promise.all([
        chatManager.publish('chat_router', JSON.stringify({...successEvent,receiverId})),
        chatManager.publish('chat_router', JSON.stringify({...successEvent,receiverId:profileId})),
      ]);
      return res.json({ 
        success: true,
        message: "Timer successfully extended."
      });
    }
    return res.status(400).json({ 
      success: false,
      message: "Invalid vote state."
    });
  } catch (err: any) {
    err.context = { location: "connectionController.extendTimer", profileId: req.user!.profile!.id, connectionId: req.validatedData.params.connectionId };
    next(err)
  }
}
export const convertConnection = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const profileId = req.user!.profile!.id;
    const {connectionId} : connectionIdType = req.validatedData.params;
    const {action}:requestHandleType = req.validatedData.body;
    const matchInfo = await getSafeMatchInfo(connectionId);
    if(!matchInfo){
      return res.status(400).json({
        success:false,
        message:"Chat ended."
      })
    }
    if (action === 'REJECT') {
      await matchManager.clearSpecificVote(connectionId, MatchAction.CONVERT);
      return res.json({
        success: true,
        message: "Friend request declined."
      });
    }
    const traceId = traceStorage.getStore()?.traceId;
    const receiverId = matchInfo.user1Id === profileId ? matchInfo.user2Id : matchInfo.user1Id;
    const voteCount = await matchManager.recordMatchVotes(connectionId,profileId,MatchAction.CONVERT);
    if (voteCount === 1){
      logger.info({ action: "convertConnection", connectionId }, "Friend request dispatched in match");
      await chatManager.publish(
        'chat_router',
        JSON.stringify({
          receiverId,
          eventType: EventType.SYSTEM_EVENT,
          eventData:{
            event: SystemAction.CONVERT_REQUESTED,
            senderId: profileId,
            connectionId
          },
          traceId
        })
      );
      return res.json({
        success:true,
        message:"Friend request sent."
      })
    }
    if (voteCount === 2){
      logger.info({ action: "convertConnection_success", connectionId }, "Match converted to friend");
      await prisma.connection.update({
        where: { id: connectionId },
        data: { status: ConnectionStatus.FRIEND, expiresAt: null }
      });
      await Promise.all([
        matchManager.clearMatchVotes(connectionId),
        matchManager.clearMatchTimer(connectionId),
        matchManager.clearMatchInfo(connectionId),
        userConnectionManager.setConnectionInfo(connectionId, profileId, receiverId, ConnectionListType.FRIEND)
      ]);
      const successEvent = {
        eventType: EventType.SYSTEM_EVENT,
        eventData: { 
          event: SystemAction.CONVERT_ACCEPTED,
          connectionId
        },
        traceId
      };
      await Promise.all([
        chatManager.publish('chat_router', JSON.stringify({ ...successEvent, receiverId: profileId })),
        chatManager.publish('chat_router', JSON.stringify({ ...successEvent, receiverId}))
      ]);
      return res.json({ success: true, message: "You are now friends!" });
    }
    return res.status(400).json({
      success: false,
      message: "Invalid vote state."
    })
  } catch (err: any) {
    err.context = { location: "connectionController.convertConnection", profileId: req.user!.profile!.id, connectionId: req.validatedData.params.connectionId };
    next(err)
  }
}
export const skipConnection = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const profileId = req.user!.profile!.id;
    const { connectionId }: connectionIdType = req.validatedData.params;
    const matchInfo = await getSafeMatchInfo(connectionId);
    if (!matchInfo) {
      return res.status(400).json({ 
        success: false,
        message: "Chat ended." 
      });
    }
    const receiverId = matchInfo.user1Id === profileId ? matchInfo.user2Id : matchInfo.user1Id;
    const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
    await prisma.connection.update({
      where: { id: connectionId },
      data: { 
        status: "ARCHIVED",
        expiresAt: null,
        finalDeleteAt: new Date(Date.now() + FIVE_DAYS_MS)
      }
    });
    await Promise.all([
      matchManager.clearMatchVotes(connectionId),
      matchManager.clearMatchTimer(connectionId),
      matchManager.clearMatchInfo(connectionId),
      userConnectionManager.setConnectionInfo(connectionId, profileId, receiverId, ConnectionListType.ARCHIVED)
    ]);
    const traceId = traceStorage.getStore()?.traceId;
    logger.info({ action: "skipConnection", connectionId, profileId }, "User skipped chat");
    await chatManager.publish(
      'chat_router',
      JSON.stringify({
        receiverId: receiverId,
        eventType: EventType.SYSTEM_EVENT,
        eventData: {
          event: SystemAction.CHAT_ENDED,
          message: "The other user has left the chat.",
          connectionId
        },
        traceId
      })
    );
    await Promise.all([
      matchManager.addToQueue(profileId),
      matchManager.leaveQueue(receiverId, UserState.IDLE)
    ]);
    return res.json({
      success: true,
      message: "Chat skipped. Re-entering matchmaking."
    });
  } catch (err: any) {
    err.context = { location: "connectionController.skipConnection", profileId: req.user!.profile!.id, connectionId: req.validatedData.params.connectionId };
    next(err)
  }
} 