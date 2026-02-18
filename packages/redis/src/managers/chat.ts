import Redis from "ioredis";
import { CachedMessage } from "../common";

export class ChatManager {
  constructor (private redis:Redis, private subRedis:Redis) {}

  async addMessage(connectionId:string,msg:CachedMessage){
    const pipeline = this.redis.pipeline();
    const key = `chat:${connectionId}`;
    pipeline.rpush(key,JSON.stringify(msg));
    pipeline.ltrim(key,-50,-1);
    pipeline.expire(key,60*60*24);
    await pipeline.exec();
  }
  async getMessages(connectionId:string){
    const rawMessages = await this.redis.lrange(`chat:${connectionId}`, 0, -1);
    return rawMessages.map((msg) => JSON.parse(msg) as CachedMessage);
  }
  async incrUnread(userId:string,connectionId:string,amt:number){
    await this.redis.hincrby(`user:unread:${userId}`,connectionId,amt);
  }
  async getUnread(userId:string){
    const rawMap = await this.redis.hgetall(`user:unread:${userId}`);
    const parsedMap: Record<string, number> = {};
    for (const [connId, countStr] of Object.entries(rawMap)) {
      parsedMap[connId] = parseInt(countStr, 10);
    }
    return parsedMap;
  }
  async resetUnread(userId:string,connectionId:string){
    await this.redis.hdel(`user:unread:${userId}`,connectionId);
  }
  async setTyping(connectionId:string,userId:string){
    await this.redis.set(`chat:typing:${connectionId}:${userId}`,"1","EX",3);
  }
  async checkTyping(connectionId:string,userId:string){
    const exists = await this.redis.exists(`chat:typing:${connectionId}:${userId}`);
    return exists === 1;
  }
  async publish(channel:string,msg:string){
    return await this.redis.publish(channel,msg);
  }
  async subscribe(channel:string){
    await this.subRedis.subscribe(channel);
  }
  onMessage(callback: (channel: string, message: string) => void) {
    this.subRedis.on("message", (channel, message) => {
      callback(channel, message);
    });
  }
}