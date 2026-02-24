import { NextFunction, Request, Response } from "express";
import { redisManager } from "../services/redis";
import { NotificationCategory } from "@matcha/redis";

export const getNotification = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const userId = req.user!.profile!.id;
    const flags = await redisManager.notification.getNotificationFlags(userId);
    return res.json({
      success:true,
      data: {
        has_new_requests: flags[NotificationCategory.NEW_FRIEND_REQUEST] === "1"
      }
    })
  } catch (err) {
    next(err)
  }
}
export const markNotificationRead = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const userId = req.user!.profile!.id;
    const category = req.validatedData.params.category as NotificationCategory ;
    await redisManager.notification.clearNotificationFlag(userId,category);
    return res.json({
      success:true,
      message:"Notification cleared"
    })
  } catch (err) {
    next(err)
  }
}