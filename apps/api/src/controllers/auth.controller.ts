import prisma from "@matcha/prisma";
import { requestPasswordResetType, resetPasswordType, signupType } from "@matcha/zod";
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import passport from 'passport';
import { COOKIE_OPTIONS } from "../constant/cookie";
import { redisManager } from "../services/redis";

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
    await redisManager.auth.cacheSession(newUser.id,newUser.tokenVersion,null);
    const token = jwt.sign({
      id:newUser.id,
      tokenVersion:newUser.tokenVersion
    },jwtSecret,{expiresIn:'7d'});
    res.cookie("token",token,COOKIE_OPTIONS);
    return res.status(201).json({message:"User created successfully"});
  }catch(err){
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
    await redisManager.auth.cacheSession(user.id,user.tokenVersion,user.profile ? user.profile.id : null);
    const token = jwt.sign({
      id:user.id,
      tokenVersion:user.tokenVersion
    },jwtSecret,{expiresIn:'7d'});
    res.cookie("token",token,COOKIE_OPTIONS);
    return res.json({message:"Logged in successfully"});
  })(req,res,next);
}

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
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
      // TODO - send email to user via Nodemailer/Resend/SendGrid
    }
    return res.json({ message: "If an account exists, a reset code has been sent." });
  } catch (err) {
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
    await redisManager.auth.invalidateSession(userId);
    return res.json({ message: "Password has been successfully reset. Please log in." });
  } catch (err) {
    next(err)
  }
};

export const logout = async (req:Request,res:Response,next:NextFunction)=>{
  try {
    const userId = req.user!.id;
    await redisManager.auth.invalidateSession(userId);
    res.clearCookie("token", COOKIE_OPTIONS);
    return res.json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
}