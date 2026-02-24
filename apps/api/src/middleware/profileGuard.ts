import { NextFunction, Request, Response } from "express";

export const profileGuard = (req:Request,res:Response,next:NextFunction) => {
  if (!req.user?.profile || !req.user.profile.id) {
    res.status(403).json({ 
      success: false,
      message: "Onboarding incomplete",
      code: "PROFILE_INCOMPLETE"
    });
    return;
  }
  next();
}