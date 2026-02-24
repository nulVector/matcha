import { NextFunction, Request, Response } from "express";

export const authGuard = (req:Request,res:Response,next:NextFunction) => {
  if (req.user) {
    next();
    return;
  }

  res.status(401).json({
    success: false,
    message: "Unauthorized: You must be logged in." 
  });
  return;
}