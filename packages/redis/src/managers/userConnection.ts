import Redis from "ioredis";
import { REMOVE_SOCKET_SCRIPT } from "../common";

export class UserConnectionManager {
  constructor (private redis:Redis) {}

  async mapSocket(userId:string,socketId:string){
    const tx = this.redis.multi();
    tx.sadd(`user:sockets:${userId}`,socketId);
    tx.set(`socket:${socketId}`,userId, "EX", 60 * 60 * 24);
    tx.set(`user:status:${userId}`,"1", "EX", 60);
    await tx.exec();
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
  async setUserStatus(userId:string) {
    await this.redis.set(`user:status:${userId}`, "1", "EX", 60);
  }
  async checkUserStatus(userId: string): Promise<boolean> {
    const exists = await this.redis.exists(`user:status:${userId}`);
    return exists === 1;
  }
}