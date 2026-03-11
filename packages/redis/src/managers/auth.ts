import Redis from "ioredis";
import { RATE_LIMIT_SCRIPT, UserSession } from "../common";

export class AuthManager {
  constructor (private redis:Redis) {}

  async cacheSession(userId:string, sessionId: string, tokenVersion: number, userProfileId:string | null, hasPassword: boolean){
    const data:UserSession = {userId,tokenVersion,userProfileId, hasPassword};
    await this.redis.set(`session:${userId}:${sessionId}`,JSON.stringify(data),"EX",60 * 60 * 24 * 7);
  } 
  async getSession(userId:string, sessionId: string): Promise<UserSession | null>{
    const data = await this.redis.get(`session:${userId}:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }
  async invalidateSession(userId:string, sessionId: string){
    await this.redis.del(`session:${userId}:${sessionId}`);
  }
  async invalidateAllUserSessions(userId: string) {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, "MATCH", `session:${userId}:*`, "COUNT", "100");
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== "0");
  }
  async setResetToken(token:string,userId:string){
    await this.redis.set(`reset:${token}`,userId,"EX",60 * 10)
  }
  async getUserIdByResetToken(token:string){
    return await this.redis.get(`reset:${token}`);
  }
  async consumeResetToken(token:string){
    await this.redis.del(`reset:${token}`);
  }
  async checkRateLimit(identifier:string,limit:number,window:number) {
    const key = `ratelimit:${identifier}`;
    const numberOfKeys= 1;
    const count = await this.redis.eval(
      RATE_LIMIT_SCRIPT,
      numberOfKeys,
      key,
      window.toString()
    )
    return (count as number) > limit
  }
  async checkIdempotency(requestId:string,expireTime:number){
    const result = await this.redis.set(`idempotency:${requestId}`, "processed", "EX", expireTime, "NX");
    return result === 'OK';
  }
  async consumeIdempotency(requestId:string){
    await this.redis.del(`idempotency:${requestId}`);
  }
}