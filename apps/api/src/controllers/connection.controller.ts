import { NextFunction, Request, Response } from "express";
import { redisManager } from "../services/redis";
import { ConnectionListType, MatchAction, UserState } from "@matcha/redis";
import { connectionIdType } from "@matcha/zod";
import prisma, { ConnectionStatus } from "@matcha/prisma";

export const joinQueue = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const profileId = req.user!.profile!.id;
    const {queueStatus} = await redisManager.userDetail.getProfileFields(profileId,["queueStatus"]);
    if(queueStatus !== UserState.IDLE) {
      return res.status(400).json({
        success:false,
        message:"You are already in the queue or currently in a match."
      })
    }
    await redisManager.match.addToQueue(profileId);
    return res.json({
      success:true,
      message:"Successfully joined the matchmaking queue."
    })
  } catch (err) {
    next(err);
  }
}
export const leaveQueue = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const profileId = req.user!.profile!.id;
    await redisManager.match.leaveQueue(profileId, UserState.IDLE);
    return res.json({
      success:true,
      message:"Successfully left the matchmaking queue."
    })
  } catch (err) {
    next(err)
  }
}
export const extendTimer = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const profileId = req.user!.profile!.id;
    const {connectionId}:connectionIdType = req.validatedData.params;
    const matchInfo = await redisManager.match.getMatchInfo(connectionId);
    if (!matchInfo) {
      return res.status(400).json({
        success:false,
        message:"Chat ended."
      })
    }
    const receiverId = matchInfo.user1Id === profileId ? matchInfo.user2Id : matchInfo.user1Id;
    const voteCount = await redisManager.match.recordMatchVotes(connectionId,profileId,MatchAction.EXTEND);
    if (voteCount === 1) {
      await redisManager.chat.publish(
        'chat_router',
        JSON.stringify({
          receiverId,
          eventType: 'SYSTEM_EVENT',
          eventData:{
            event:"EXTEND_REQUESTED",
            senderId:profileId,
            connectionId
          }
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
        redisManager.match.setMatchTimer(connectionId, 60 * 30),
        redisManager.match.clearMatchVotes(connectionId)
      ]);
      const successEvent = {
        eventType:"SYSTEM_EVENT",
        eventData:{
          event:"EXTEND_ACCEPTED",
          expiresAt:newExpiresAt.toISOString(),
          connectionId
        }
      }
      await Promise.all([
        redisManager.chat.publish('chat_router', JSON.stringify({...successEvent,receiverId})),
        redisManager.chat.publish('chat_router', JSON.stringify({...successEvent,receiverId:profileId})),
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
  } catch (err) {
    next(err)
  }
}
export const convertConnection = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const profileId = req.user!.profile!.id;
    const {connectionId} : connectionIdType = req.validatedData.params;
    const matchInfo = await redisManager.match.getMatchInfo(connectionId);
    if(!matchInfo){
      return res.status(400).json({
        success:false,
        message:"Chat ended."
      })
    }
    const receiverId = matchInfo.user1Id === profileId ? matchInfo.user2Id : matchInfo.user1Id;
    const voteCount = await redisManager.match.recordMatchVotes(connectionId,profileId,MatchAction.CONVERT);
    if (voteCount === 1){
      await redisManager.chat.publish(
        'chat_router',
        JSON.stringify({
          receiverId,
          eventType:'SYSTEM_EVENT',
          eventData:{
            event: "CONVERT_REQUESTED",
            senderId: profileId,
            connectionId
          }
        })
      );
      return res.json({
        success:true,
        message:"Friend request sent."
      })
    }
    if (voteCount === 2){
      await prisma.connection.update({
        where: { id: connectionId },
        data: { status: ConnectionStatus.FRIEND, expiresAt: null }
      });
      await Promise.all([
        redisManager.match.clearMatchVotes(connectionId),
        redisManager.match.clearMatchTimer(connectionId),
        redisManager.match.clearMatchInfo(connectionId),
        redisManager.userDetail.cacheConnectionList(profileId, [], ConnectionListType.FRIEND),
        redisManager.userDetail.cacheConnectionList(receiverId, [], ConnectionListType.FRIEND)
      ]);
      const successEvent = {
        eventType: "SYSTEM_EVENT",
        eventData: { 
          event: "CONVERT_ACCEPTED",
          connectionId
        }
      };
      await Promise.all([
        redisManager.chat.publish('chat_router', JSON.stringify({ ...successEvent, receiverId: profileId })),
        redisManager.chat.publish('chat_router', JSON.stringify({ ...successEvent, receiverId}))
      ]);
      return res.json({ success: true, message: "You are now friends!" });
    }
    return res.status(400).json({
      success: false,
      message: "Invalid vote state."
    })
  } catch (err) {
    next(err)
  }
}
export const skipConnection = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const profileId = req.user!.profile!.id;
    const { connectionId }: connectionIdType = req.validatedData.params;
    const matchInfo = await redisManager.match.getMatchInfo(connectionId);
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
        finalDeleteAt: new Date(Date.now() + FIVE_DAYS_MS)
      }
    });
    await Promise.all([
      redisManager.match.clearMatchVotes(connectionId),
      redisManager.match.clearMatchTimer(connectionId),
      redisManager.match.clearMatchInfo(connectionId)
    ]);
    await redisManager.chat.publish(
      'chat_router',
      JSON.stringify({
        receiverId: receiverId,
        eventType: "SYSTEM_EVENT",
        eventData: {
          event: "CHAT_ENDED",
          message: "The other user has left the chat."
        }
      })
    );
    await Promise.all([
      redisManager.match.addToQueue(profileId),
      redisManager.match.leaveQueue(receiverId, UserState.IDLE)
    ]);
    return res.json({
      success: true,
      message: "Chat skipped. Re-entering matchmaking."
    });
  } catch (err) {
    next(err)
  }
}