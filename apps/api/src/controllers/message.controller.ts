import prisma from "@matcha/prisma";
import { CachedMessage, ConnectionListType } from "@matcha/redis";
import { connectionIdType, getChatHistoryType } from "@matcha/zod";
import { NextFunction, Request, Response } from "express";
import { redisManager } from "../services/redis";

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
    let chatPartnerMeta = null;
    let connectionStatus: string | null = null;
    let connectionExpiresAt: string | null = null;
    const [matchInfo, connInfo] = await Promise.all([
      redisManager.match.getMatchInfo(connectionId),
      redisManager.userConnection.getConnectionInfo(connectionId)
    ]);
    const activeInfo = matchInfo || connInfo;
    if (activeInfo) {
      if (matchInfo) {
        connectionStatus = "MATCHED";
        connectionExpiresAt = matchInfo.expiresAt;
      } else if (connInfo) {
        connectionStatus = connInfo.status;
        connectionExpiresAt = null;
      }
      const partnerId = activeInfo.user1Id === profileId ? activeInfo.user2Id : activeInfo.user1Id;
      const partnerProfile = await redisManager.userDetail.getProfileFields(partnerId, ['username', 'avatarUrl', 'openingQues']);
      if (partnerProfile && partnerProfile.username) {
        chatPartnerMeta = {
          id: partnerId,
          username: partnerProfile.username,
          avatarUrl: partnerProfile.avatarUrl,
          openingQues: partnerProfile.openingQues || null
        };
      }
    }
    if (!chatPartnerMeta || !connectionStatus) {
      const connection = await prisma.connection.findFirst({
        where: {
          id: connectionId,
          OR: [{ user1Id: profileId }, { user2Id: profileId }],
          status: { in: ["MATCHED", "FRIEND", "ARCHIVED"] }
        },
        select: {
          id: true, status: true, user1Id: true, user2Id: true, expiresAt: true,
          user1: { select: { id: true, username: true, avatarUrl: true, openingQues: true } },
          user2: { select: { id: true, username: true, avatarUrl: true, openingQues: true } }
        }
      });
      if (!connection) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You can not access this chat."
        });
      }
      connectionStatus = connection.status;
      connectionExpiresAt = connection.expiresAt ? connection.expiresAt.toISOString() : null;
      const otherUser = connection.user1.id === profileId ? connection.user2 : connection.user1;
      chatPartnerMeta = {
        id: otherUser.id,
        username: otherUser.username,
        avatarUrl: otherUser.avatarUrl,
        openingQues: otherUser.openingQues || null
      };
      if (connection.status === "MATCHED" && connection.expiresAt) {
        await redisManager.match.setMatchInfo(
          connectionId, 
          connection.user1Id, 
          connection.user2Id, 
          connection.expiresAt.toISOString()
        );
      } else if (connection.status === "FRIEND" || connection.status === "ARCHIVED") {
        await Promise.all([
          redisManager.userConnection.setConnectionInfo(
            connectionId, 
            connection.user1Id, 
            connection.user2Id, 
            connection.status as ConnectionListType
          ),
          redisManager.userDetail.addSingleAuthConnection(
            profileId, 
            connectionId, 
            connection.status as ConnectionListType
          )
        ]);
      }
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
    return res.json({
      success: true,
      data: orderedMessages,
      nextCursor,
      meta: chatPartnerMeta,
      matchData: {
        id: connectionId,
        status: connectionStatus,
        expiresAt: connectionExpiresAt
      }
    });
  } catch (err: any) {
    err.context = { location: "messageController.getChatHistory", profileId: req.user!.profile!.id, connectionId: req.validatedData.params.connectionId };
    next(err)
  }
}