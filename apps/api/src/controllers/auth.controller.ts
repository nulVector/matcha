import prisma from "@matcha/prisma";
import { requestPasswordResetType, resetPasswordType, signupType } from "@matcha/zod";
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import passport from 'passport';
import { COOKIE_OPTIONS } from "../constant/cookie";
import { redisManager } from "../services/redis";
import { createId } from '@paralleldrive/cuid2';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret){
  throw new Error("Environment variables not available");
}

export const signup = async (req:Request, res:Response,next:NextFunction) =>{
  try{
    const {email,password}:signupType = req.validatedData.body;
    const hashedPassword = await bcrypt.hash(password,10);
    const newUser = await prisma.user.create({
      data:{
        email,
        password:hashedPassword
      },select:{
        id:true,
        tokenVersion:true
      }
    });
    const sessionId = createId();
    await redisManager.auth.cacheSession(newUser.id, sessionId, newUser.tokenVersion, null, true);
    const token = jwt.sign({
      id:newUser.id,
      sessionId,
      tokenVersion:newUser.tokenVersion
    },jwtSecret,{expiresIn:'7d'});
    res.cookie("token",token,COOKIE_OPTIONS);
    return res.status(201).json({message:"User created successfully"});
  }catch (err: any){
    err.context = { location: "authController.signup", emailAttempted: req.validatedData.body.email };
    next(err)
  }
}

export const login = async (req:Request,res:Response,next:NextFunction)=>{
  passport.authenticate('local',{session:false},async (err:Error,user: Express.User | false,info:{message:string}|undefined)=>{
    if (err) {
      next(err);
      return;
    }
    if(!user) {
      res.status(401).json({ 
        message: info?.message || "Authentication failed" 
      });
      return;
    }
    try {
      const sessionId = createId();
      await redisManager.auth.cacheSession(user.id, sessionId, user.tokenVersion, user.profile ? user.profile.id : null, true);
      const token = jwt.sign({
        id:user.id,
        sessionId,
        tokenVersion:user.tokenVersion
      },jwtSecret,{expiresIn:'7d'});
      res.cookie("token",token,COOKIE_OPTIONS);
      return res.json({message:"Logged in successfully"});
    } catch (innerErr: any) {
      innerErr.context = { location: "authController.login_token_generation", userId: user.id };
      next(innerErr);
    }
  })(req,res,next);
}

export const googleAuthCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const sessionId = createId();
    await redisManager.auth.cacheSession(user.id, sessionId, user.tokenVersion, user.profile ? user.profile.id : null, user.hasPassword);
    const token = jwt.sign({
      id: user.id,
      sessionId: sessionId,
      tokenVersion: user.tokenVersion
    }, jwtSecret, { expiresIn: '7d' });
    res.cookie("token", token, COOKIE_OPTIONS);
    const frontendUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const redirectUrl = user.profile ? `${frontendUrl}/home` : `${frontendUrl}/onboarding`;
    res.redirect(redirectUrl);
  } catch (err: any) {
    err.context = { location: "authController.googleAuthCallback", userId: req.user!.id };
    next(err);
  }
};

export const requestResetPassword = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const {email}:requestPasswordResetType = req.validatedData.body;
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      await redisManager.auth.setResetToken(resetToken, user.id);
      const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
      // TODO - send email to user via Nodemailer/Resend/SendGrid
    }
    return res.json({ message: "If an account exists, a reset code has been sent." });
  } catch (err: any) {
    err.context = { location: "authController.requestResetPassword", emailAttempted: req.validatedData.body.email };
    next(err)
  }
}

export const confirmResetPassword = async (req: Request, res: Response,next:NextFunction) => {
  try {
    const {token,password}:resetPasswordType = req.validatedData!.body;
    const userId = await redisManager.auth.getUserIdByResetToken(token);
    if (!userId) {
      return res.status(400).json({ message: "Invalid or expired reset token." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id:userId },
      data: { 
        password: hashedPassword,
        tokenVersion: { increment: 1 }
      }
    });
    await redisManager.auth.consumeResetToken(token);
    await redisManager.auth.invalidateAllUserSessions(userId);
    return res.json({ message: "Password has been successfully reset. Please log in." });
  } catch (err: any) {
    err.context = { location: "authController.confirmResetPassword" };
    next(err)
  }
};

export const logout = async (req:Request,res:Response,next:NextFunction)=>{
  try {
    const userId = req.user!.id;
    //TODO - extract this out 
    const token = req.cookies['token'];
    const decoded = jwt.decode(token) as any; 
    await redisManager.auth.invalidateSession(userId, decoded.sessionId);
    res.clearCookie("token", COOKIE_OPTIONS);
    return res.json({ message: "Logged out successfully" });
  } catch (err: any) {
    err.context = { location: "authController.logout", userId: req.user!.id };
    next(err);
  }
}