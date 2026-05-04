import { JwtPayload } from "@matcha/shared";
import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken';
import { COOKIE_OPTIONS } from "../constant/cookie";
import { redisManager } from "../services/redis";
import { logger } from "@matcha/logger";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret){
  throw new Error("Environment variables not available");
}

const REFRESH_THRESHOLD = 60 * 60 * 24 * 2;

export const slidingSession = async (req:Request, res: Response, next: NextFunction) =>{
  try {
    const userProfile = req.user!.profile;
    const hasPassword = req.user!.hasPassword;
    const currentToken = req.cookies["token"];
    const decoded = jwt.decode(currentToken) as (JwtPayload & { exp: number }) | null;
    if (!decoded || !decoded.exp) return next();
    const currentTime = Math.floor(Date.now() / 1000);
    const timeRemaining = decoded.exp - currentTime;
    if (timeRemaining < REFRESH_THRESHOLD) {
      const newToken = jwt.sign({
        id: decoded.id,
        sessionId: decoded.sessionId
      },jwtSecret, {expiresIn: '7d' });
      res.cookie("token", newToken, COOKIE_OPTIONS);
      await redisManager.auth.cacheSession(decoded.id, decoded.sessionId, userProfile ? userProfile.id : null, hasPassword);
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