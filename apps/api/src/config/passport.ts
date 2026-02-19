import prisma from "@matcha/prisma";
import bcrypt from "bcrypt";
import { PassportStatic } from "passport";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import { Strategy as LocalStrategy } from "passport-local";
import { redisManager } from "../services/redis";

interface JwtPayload {
  id:string,
  tokenVersion:number
}
const jwtSecret = process.env.JWT_SECRET;
if(!jwtSecret){
  throw new Error("Environment variables not availble");
}

export const configurePassport = (passport:PassportStatic) =>{
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
            tokenVersion:true,
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
          tokenVersion:user.tokenVersion,
          profile: hasProfile ? {id:user.profile!.id} : null 
        });                  
      }catch(err){
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
        const session = await redisManager.auth.getSession(jwt_payload.id);
        if (!session || session.tokenVersion !== jwt_payload.tokenVersion) {
          return done(null, false);
        }
        const user: Express.User = {
          id: session.userId,
          tokenVersion: session.tokenVersion,
          profile: session.userProfileId ? { id: session.userProfileId } : null
        };
        return done(null, user);
      }catch(err){
        return done(err)
      }
    }
  ))
}