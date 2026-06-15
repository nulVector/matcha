import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken';
import { COOKIE_OPTIONS } from "../constant/cookie";
import { authManager } from "../services/redis";
import { logger } from "@matcha/logger";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret){
  throw new Error("Environment variables not available");
}

const REFRESH_THRESHOLD = 60 * 60 * 24 * 2;

export const slidingSession = async (req:Request, res: Response, next: NextFunction) =>{
  try {
    const userId = req.user!.id;
    const userProfile = req.user!.profile;
    const hasPassword = req.user!.hasPassword;
    const sessionId = req.user!.sessionId;
    const exp = req.user!.exp;
    if (!sessionId || !exp) return next();
    const currentTime = Math.floor(Date.now() / 1000);
    const timeRemaining = exp - currentTime;
    if (timeRemaining < REFRESH_THRESHOLD) {
      const newToken = jwt.sign({
        id: userId,
        sessionId
      },jwtSecret, {expiresIn: '7d' });
      res.cookie("token", newToken, COOKIE_OPTIONS);
      await authManager.cacheSession(userId, sessionId, userProfile ? userProfile.id : null, hasPassword);
    }
    next();
  } catch (err) {
      logger.error({ 
        location:"middleware.slidingSession",
        err 
      });
      next();
  }
}