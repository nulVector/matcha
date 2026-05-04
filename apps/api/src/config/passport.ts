import prisma from "@matcha/prisma";
import bcrypt from "bcrypt";
import { JwtPayload } from "@matcha/shared";
import { PassportStatic } from "passport";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { redisManager } from "../services/redis";

const jwtSecret = process.env.JWT_SECRET;
const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
if(!jwtSecret || !clientID || !clientSecret){
  throw new Error("Environment variables not availble");
}

export const configurePassport = (passport:PassportStatic) =>{
  passport.use(new GoogleStrategy({
    clientID,
    clientSecret,
    callbackURL: '/api/auth/google/callback',
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const googleId = profile.id;
      if (!email) {
        return done(new Error("No email provided from Google"), false);
      }
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId: googleId },
            { email: email }
          ]
        },
        select: {
          id: true,
          googleId: true,
          password: true,
          deletedAt: true,
          profile: {
            select: { id: true }
          }
        }
      });
      if (user && !user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: googleId },
          select: {
            id: true,
            googleId: true,
            password: true,
            deletedAt: true,
            profile: { select: { id: true } }
          }
        });
      }
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: email,
            googleId: googleId,
          },
          select: {
            id: true,
            googleId: true,
            password: true,
            deletedAt: true,
            profile: { select: { id: true } }
          }
        });
      }
      const hasProfile = user.profile !== null;
      if (user.deletedAt) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            deletedAt: null,
            reactivatedAt: new Date(),
            profile: hasProfile ? {
              update: { isActive: true }
            } : undefined
          }
        });
      }
      return done(null, {
        id: user.id,
        profile: hasProfile ? { id: user.profile!.id } : null,
        hasPassword: !!user.password
      });
    } catch (err: any) {
      err.context = { location: "GoogleStrategy", emailAttempted: profile.emails?.[0]?.value };
      return done(err);
    }
  }));
  passport.use(new LocalStrategy(
    {usernameField:"email"},
    async (email,password,done) => {
      try{
        const user = await prisma.user.findUnique({
          where:{
            email
          },
          select:{
            id:true,
            password:true,
            deletedAt:true,
            profile: {
              select:{
                id: true
              }
            }
          }
        });
        if(!user || !user.password) {
          return done(null, false,{message:"Incorrect Credentials"})
        }
        const isMatch = await bcrypt.compare(password,user.password);
        if (!isMatch){
          return done(null,false,{message:"Incorrect Credentials"})
        }
        const hasProfile = user.profile !== null;
        if (user.deletedAt) {
          await prisma.user.update({
            where:{
              id:user.id
            },
            data:{
              deletedAt: null,
              reactivatedAt: new Date(),
              profile: hasProfile ? {
                update:{
                  isActive: true
                }
              } : undefined
            }
          })
        }
        return done(null, {
          id:user.id,
          profile:hasProfile ? {id:user.profile!.id} : null,
          hasPassword:true
        });                  
      }catch(err: any){
        err.context = { location: "LocalStrategy", emailAttempted: email };
        return done(err)
      }
    }
  ))
  passport.use(new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          let token = null;
          if(req && req.cookies){
            token = req.cookies['token'];
          }
          return token;
        }
      ]),
      secretOrKey: jwtSecret,
    },
    async (jwt_payload:JwtPayload,done) => {
      try {
        const session = await redisManager.auth.getSession(jwt_payload.id, jwt_payload.sessionId);
        if (!session) {
          return done(null, false);
        }
        const user: Express.User = {
          id: session.userId,
          profile: session.userProfileId ? { id: session.userProfileId } : null,
          hasPassword: session.hasPassword
        };
        return done(null, user);
      }catch(err: any){
        err.context = { location: "JwtStrategy", targetUserId: jwt_payload.id };
        return done(err)
      }
    }
  ))
}