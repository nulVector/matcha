import prisma from "@matcha/prisma";
import { requestPasswordResetType, resetPasswordType, signupType } from "@matcha/zod";
import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import passport from 'passport';
import { COOKIE_OPTIONS } from "../constant/cookie";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret){
  throw new Error("Environment variables not available");
}
//TODO- Cache email and ip address to rate limit
export const signup = async (req:Request, res:Response,next:NextFunction) =>{
  try{
    const {email,password}:signupType = req.validatedData.body;
    const hashedPassword = await bcrypt.hash(password,10);
    const newUserId = await prisma.user.create({
      data:{
        email,
        password:hashedPassword
      },select:{
        id:true
      }
    });
    const token = jwt.sign({
      id:newUserId
    },jwtSecret,{expiresIn:'7d'});
    res.cookie("token",token,COOKIE_OPTIONS);
    res.status(201).json({message:"User created successfully"});
    return;
  }catch(err){
    next(err)
  }
}

export const login = async (req:Request,res:Response,next:NextFunction)=>{
  passport.authenticate('local',{session:false},(err:Error,user: Express.User | false,info:{message:string}|undefined)=>{
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
    const token = jwt.sign({
      id:user.id
    },jwtSecret,{expiresIn:'7d'});
    res.cookie("token",token,COOKIE_OPTIONS);
    res.json({message:"Logged in successfully"});
    return;
  })(req,res,next);
}

export const requestReset = async (req:Request,res:Response,next:NextFunction) => {
  try {
    const {email}:requestPasswordResetType = req.validatedData.body;
    const user = await prisma.user.count({
      where: { 
        email
      }
    }) > 0;

    if (user) {
      
       //TODO - generate otp and send to email
    }
    res.json({ message: "If an account exists, a reset code has been sent." });
    return;
  } catch (err) {
    next(err)
  }
}

export const confirmReset = async (req: Request, res: Response,next:NextFunction) => {
  try {
    const {token,password}:resetPasswordType = req.validatedData!.body;
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where:{
        token
      }
    })
    if(!tokenRecord || tokenRecord.expiresAt < new Date()){
      res.status(400).json({ message: "Invalid or expired token"});
      return
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { 
          id:tokenRecord.userId
        },
        data: { 
          password: hashedPassword 
        }
      }),
      prisma.passwordResetToken.delete({
        where:{
          id:tokenRecord.id
        }
      })
    ])
    return res.json({ message: "Password updated successfully." });
  } catch (err) {
    next(err)
  }
};
//TODO - Cache JWT to blacklist after logout and check in auth to not allow blacklisted jwt | is it needed if i add session mangement?
export const logout = async (req:Request,res:Response)=>{
  res.clearCookie("token",{...COOKIE_OPTIONS,maxAge:0});
  res.json({message:"logged out"});
  return;
}
//TODO - how does redis help with auth in Websocket