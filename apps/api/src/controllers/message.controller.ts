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
    let [isFriend,isArchived] = await Promise.all([
      redisManager.userDetail.inAuthConnectionList(profileId,connectionId,ConnectionListType.FRIEND),
      redisManager.userDetail.inAuthConnectionList(profileId,connectionId,ConnectionListType.ARCHIVED),
    ])
    if(!isFriend && !isArchived){
      const connection = await prisma.connection.findFirst({
        where:{
          id:connectionId,
          OR:[
            {user1Id:profileId},{user2Id:profileId}
          ],
          status: {
            in: ["FRIEND", "ARCHIVED"] 
          }
        },
        select:{ id:true, status:true}
      });
      if(!connection){
        return res.status(403).json({
          success:false,
          message:"Forbidden: You can not access this chat."
        })
      }
      const listType = connection.status === "FRIEND" ? ConnectionListType.FRIEND : ConnectionListType.ARCHIVED;
      await redisManager.userDetail.addSingleAuthConnection(profileId, connectionId, listType);
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
        const dbMessages = await prisma.message.findMany({
          where: { connectionId },
          orderBy: { createdAt: 'desc' },
          take: limit + 1,
          select: {
            id: true, content: true, senderId: true, createdAt: true, type: true
          }
        });
        if (dbMessages.length > limit) {
          const nextItem = dbMessages.pop();
          nextCursor = nextItem!.id;
        }
        orderedMessages = dbMessages.reverse().map(msg=>({
          id:msg.id,
          content:msg.content,
          senderId:msg.senderId,
          createdAt:msg.createdAt.toISOString(),
          type:msg.type
        } as CachedMessage));
        await redisManager.chat.seedMessages(connectionId, orderedMessages);
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
      nextCursor
    });
  } catch (err: any) {
    err.context = { location: "messageController.getChatHistory", profileId: req.user!.profile!.id, connectionId: req.validatedData.params.connectionId };
    next(err)
  }
}
