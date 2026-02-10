import { NextFunction, Request, Response } from "express";

export const authGuard = async (req:Request,res:Response,next:NextFunction) => {
  if (req.user) {
    next();
    return;
  }

  res.status(401).json({ 
    message: "Unauthorized: You must be logged in." 
  });
  return;
}