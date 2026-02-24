import Redis from "ioredis";
import { CachedMessage } from "../common";

export class ChatManager {
  constructor (private redis:Redis, private subRedis:Redis) {}

  async processNewMessage(
    connectionId: string, 
    receiverId: string, 
    message: CachedMessage, 
    eventType: string
  ) {
    const tx = this.redis.multi(); 
    const chatKey = `chat:${connectionId}`;
    const unreadKey = `user:unread:${receiverId}`;

    tx.rpush(chatKey, JSON.stringify(message));
    tx.ltrim(chatKey, -50, -1);
    tx.expire(chatKey, 60 * 60 * 24);
    tx.hincrby(unreadKey, connectionId, 1);
    const publishPayload = JSON.stringify({
      receiverId,
      eventType,
      eventData: message
    });
    tx.publish('chat_router', publishPayload);
    await tx.exec();
  }
  async getMessages(connectionId:string){
    const rawMessages = await this.redis.lrange(`chat:${connectionId}`, 0, -1);
    return rawMessages.map((msg) => JSON.parse(msg) as CachedMessage);
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