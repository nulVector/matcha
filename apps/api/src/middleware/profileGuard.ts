import { NextFunction, Request, Response } from "express";

export const profileGuard = async (req:Request,res:Response,next:NextFunction) => {
  if (!req.user?.profile || !req.user.profile.id || !req.user.profile.username) {
    res.status(403).json({ 
      success: false,
      message: "Onboarding incomplete",
      code: "USERNAME_REQUIRED" 
    });
    return;
  }
  next();
}