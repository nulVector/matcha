import Redis from "ioredis";
import { ConnectionListType, REMOVE_SOCKET_SCRIPT } from "../common";
import { getDeterministicIds } from "@matcha/shared";

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
  async setUserStatus(userId: string) {
    await this.redis.set(`user:status:${userId}`, Date.now().toString(), "EX", 60 * 2);
  }
  async checkUserStatus(userId: string): Promise<boolean> {
    const exists = await this.redis.exists(`user:status:${userId}`);
    return exists === 1;
  }
  async setConnectionInfo(connectionId:string,id1:string,id2:string, status:ConnectionListType){
    const key = `connection:info:${connectionId}`;
    const [user1Id,user2Id] = getDeterministicIds(id1,id2)
    const tx = this.redis.multi();
    tx.hset(key,{
      user1Id,
      user2Id,
      status
    })
    tx.expire(key, 60 * 60 * 24 * 7)
    await tx.exec()
  }
  async getConnectionInfo(connectionId:string){
    const info = await this.redis.hgetall(`connection:info:${connectionId}`);
    if (Object.keys(info).length === 0) return null;
    return info as { user1Id: string; user2Id: string; status:ConnectionListType};
  }
  async clearConnectionInfo(connectionId:string){
    await this.redis.del(`connection:info:${connectionId}`);
  }
}