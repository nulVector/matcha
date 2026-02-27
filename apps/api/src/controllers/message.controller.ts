import prisma from "@matcha/prisma";
import { CachedMessage, ConnectionListType } from "@matcha/redis";
import { connectionIdType } from "@matcha/zod";
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
  } catch (err) {
    next(err)
  }
}

export const getChatHistory = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const profileId = req.user!.profile!.id;
    const {connectionId}:connectionIdType = req.validatedData.params;
    let [isFriend,isArchived] = await Promise.all([
      redisManager.userDetail.inConnectionList(profileId,connectionId,ConnectionListType.FRIEND),
      redisManager.userDetail.inConnectionList(profileId,connectionId,ConnectionListType.ARCHIVED),
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
    }
    let messages = await redisManager.chat.getMessages(connectionId);
    if (!messages || messages.length === 0) {
      const dbMessages = await prisma.message.findMany({
        where: { connectionId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          content: true,
          senderId: true,
          createdAt: true,
          type: true
        }
      });
      const orderedMessages = dbMessages.reverse();
      messages = orderedMessages.map(msg=>({
        id:msg.id,
        content:msg.content,
        senderId:msg.senderId,
        createdAt:msg.createdAt.toISOString(),
        type:msg.type
      } as CachedMessage));
      await redisManager.chat.seedMessages(connectionId, messages);
    }
    return res.json({
      success: true,
      data: messages
    });
  } catch (err) {
    next(err)
  }
}
