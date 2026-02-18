import Redis from "ioredis";
import { REMOVE_SOCKET_SCRIPT, UserStatus } from "../common";

export class UserConnectionManager {
  constructor (private redis:Redis) {}

  async mapSocket(userId:string,socketId:string){
    const pipeline = this.redis.pipeline();
    pipeline.sadd(`user:sockets:${userId}`,socketId);
    pipeline.set(`socket:${socketId}`,userId, "EX", 60 * 60 * 24);
    pipeline.set(`user:status:${userId}`,UserStatus.ONLINE, "EX", 60);
    await pipeline.exec();
  }
  async getUserSockets(userId:string){
    return await this.redis.smembers(`user:sockets:${userId}`);
  }
  async removeSocket(socketId: string): Promise<number> {
    const key = `socket:${socketId}`;
    const count = await this.redis.eval(
      REMOVE_SOCKET_SCRIPT,
      1,
      key,
      socketId
    );
    return count as number;
  }
  async countSockets(userId:string){
    return await this.redis.scard(`user:sockets:${userId}`);
  }
  async setUserStatus(userId:string,status:UserStatus) {
    const pipeline = this.redis.pipeline()
    pipeline.hset(`user:profile:${userId}`, "status", status);
    pipeline.expire(`user:profile:${userId}`, 300);
    await pipeline.exec();
  }
  async getUserStatus(userId:string): Promise<UserStatus | null> {
    return await this.redis.hget(`user:profile:${userId}`,"status") as UserStatus;
  }
}