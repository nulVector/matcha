import prisma from "@matcha/prisma";
import { ConnectionListType } from "@matcha/redis";
import { connectionIdType, getChatHistoryType } from "@matcha/zod";
import { NextFunction, Request, Response } from "express";
import { redisManager } from "../services/redis";
import { CachedMessage } from "@matcha/shared";

export const getUnreadCounts = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const profileId = req.user!.profile!.id;
    const isHydrated = await redisManager.chat.isUnreadHydrated(profileId);
    if (!isHydrated) {
      const unreadData = await prisma.$queryRaw<{ connectionId: string, count: number }[]>`
        SELECT 
          m."connectionId", 
          CAST(COUNT(m.id) AS INTEGER) as count
        FROM "Message" m
        JOIN "Connection" c ON m."connectionId" = c.id
        WHERE m."senderId" != ${profileId}
          AND m.type::text = 'TEXT' 
          AND c.status::text IN ('FRIEND', 'ARCHIVED')
          AND (
            (c."user1Id" = ${profileId} AND (c."user1LastReadAt" IS NULL OR m."createdAt" > c."user1LastReadAt"))
            OR
            (c."user2Id" = ${profileId} AND (c."user2LastReadAt" IS NULL OR m."createdAt" > c."user2LastReadAt"))
          )
        GROUP BY m."connectionId"
      `;
      await redisManager.chat.seedUnreadCount(profileId,unreadData)
      await redisManager.chat.setUnreadHydrateflag(profileId);
    }
    const unreadCount = await redisManager.chat.getUnread(profileId);
    res.json({
      success:true,
      data: unreadCount
    })
  } catch (err: any) {
    err.context = { location: "messageController.getUnreadCounts", profileId: req.user!.profile!.id };
    next(err)
  }
}

export const getChatHistory = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const profileId = req.user!.profile!.id;
    const {connectionId}:connectionIdType = req.validatedData.params;
    const { cursor, limit = 50 }: getChatHistoryType = req.validatedData.query;   
    
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      select: { 
        user1Id: true,
        user2Id: true,
        status: true,
        expiresAt: true, 
        user1HistoryClearedAt: true, 
        user2HistoryClearedAt: true,
        user1LastReadAt: true, 
        user2LastReadAt: true 
      }
    });
    const isParticipant = connection && (connection.user1Id === profileId || connection.user2Id === profileId);
    const isUnfriended = connection?.status === "UNFRIENDED";
    if (!connection || !isParticipant || isUnfriended) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You can not access this chat."
      });
    }
    const [ partnerId, historyClearedAt, partnerLastReadAt ] = connection.user1Id === profileId 
      ? [connection.user2Id, connection.user1HistoryClearedAt, connection.user2LastReadAt]
      : [connection.user1Id, connection.user2HistoryClearedAt, connection.user1LastReadAt]
    
    const partnerLastReadTime = partnerLastReadAt ? new Date(partnerLastReadAt).getTime() : 0;
    
    const connectionStatus = connection.status;
    const connectionExpiresAt = connection.expiresAt ? connection.expiresAt.toISOString() : null;
      
    let chatPartnerMeta = null;
    const partnerProfile = await redisManager.userDetail.getProfileFields(partnerId, ['username', 'avatarUrl', 'openingQues', 'isActive']);
    
    if (partnerProfile && partnerProfile.username) {
      chatPartnerMeta = {
        id: partnerId,
        username: partnerProfile.username,
        avatarUrl: partnerProfile.avatarUrl,
        openingQues: partnerProfile.openingQues || null,
        isActive: partnerProfile.isActive
      };
    } else {
      const dbPartnerProfile = await prisma.userProfile.findUnique({
        where: { id: partnerId },
        select: { username: true, avatarUrl: true, openingQues: true, isActive: true }
      });
      chatPartnerMeta = {
        id: partnerId,
        username: dbPartnerProfile?.username || "Unknown",
        avatarUrl: dbPartnerProfile?.avatarUrl || "",
        openingQues: dbPartnerProfile?.openingQues || null,
        isActive: dbPartnerProfile?.isActive ?? false
      };
      if (connectionStatus === "MATCHED" && connection.expiresAt) {
        await redisManager.match.setMatchInfo(connectionId, connection.user1Id, connection.user2Id, connection.expiresAt.toISOString());
      } else if (connectionStatus === "FRIEND" || connectionStatus === "ARCHIVED") {
        await redisManager.userConnection.setConnectionInfo(connectionId, connection.user1Id, connection.user2Id, connectionStatus as ConnectionListType);
      }
    }

    let partnerRequested = null;
    let iRequestedExtend = false;
    let iRequestedConvert = false;
    if (connectionStatus === "MATCHED") {
      const votes = await redisManager.match.getMatchVotes(connectionId);
      iRequestedExtend = votes.extend.includes(profileId);
      iRequestedConvert = votes.convert.includes(profileId);
      if (votes.extend.includes(partnerId)) partnerRequested = "EXTEND";
      else if (votes.convert.includes(partnerId)) partnerRequested = "CONVERT";
    }

    let orderedMessages: CachedMessage[] = [];
    let nextCursor: string | undefined = undefined;
    if (cursor) {
      const dbMessages = await prisma.message.findMany({
        where: { connectionId },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        skip: 1,
        cursor: { id: cursor },
        select: {
          id: true, content: true, senderId: true, createdAt: true, type: true
        }
      });
      if (dbMessages.length > limit) {
        const nextItem = dbMessages.pop();
        nextCursor = nextItem!.id;
      }
      orderedMessages = dbMessages.reverse().map(msg => ({
        id: msg.id, 
        content: msg.content, 
        senderId: msg.senderId,
        createdAt: msg.createdAt.toISOString(), 
        type: msg.type
      } as CachedMessage));
    }
    else {
      let messages = await redisManager.chat.getMessages(connectionId);
      if (!messages || messages.length === 0) {
        if (connectionStatus === "MATCHED") {
          orderedMessages = [];
        } else {
          const dbMessages = await prisma.message.findMany({
            where: { connectionId },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            select: { id: true, content: true, senderId: true, createdAt: true, type: true }
          });
          if (dbMessages.length > limit) {
            const nextItem = dbMessages.pop();
            nextCursor = nextItem!.id;
          }
          orderedMessages = dbMessages.reverse().map(msg=>({
            id: msg.id, content: msg.content, senderId: msg.senderId,
            createdAt: msg.createdAt.toISOString(), type: msg.type
          } as CachedMessage));
          await redisManager.chat.seedMessages(connectionId, orderedMessages);
        }
      } else {
        orderedMessages = messages;
        if (orderedMessages.length === limit && orderedMessages[0]) {
          nextCursor = orderedMessages[0].id; 
        }
      }
    }

    if (historyClearedAt) {
      const historyClearedTime = historyClearedAt.getTime();
      orderedMessages = orderedMessages.filter(
        (msg) => new Date(msg.createdAt).getTime() >= historyClearedTime
      );
    }
    const finalMessages = orderedMessages.map(msg => ({
      ...msg,
      isRead: partnerLastReadAt ? new Date(msg.createdAt).getTime() <= partnerLastReadTime : false
    }));

    return res.json({
      success: true,
      data: finalMessages,
      nextCursor,
      meta: chatPartnerMeta,
      matchData: {
        id: connectionId,
        status: connectionStatus,
        expiresAt: connectionExpiresAt,
        partnerRequested,
        iRequestedExtend,
        iRequestedConvert
      }
    });
  } catch (err: any) {
    err.context = { location: "messageController.getChatHistory", profileId: req.user!.profile!.id, connectionId: req.validatedData.params.connectionId };
    next(err)
  }
}