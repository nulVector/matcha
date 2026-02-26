import Redis from "ioredis";
import { CachedMessage, UnreadCountData } from "../common";

export class ChatManager {
  constructor (private redis:Redis, private subRedis:Redis) {}

  async setActiveChat(userId:string,connectionId:string){
    await this.redis.set(`user:${userId}:activeChat`,connectionId,"EX",60 * 60);
  }
  async removeActiveChat(userId:string){
    await this.redis.del(`user:${userId}:activeChat`)
  }
  async getActiveChat(userId:string){
    return await this.redis.get(`user:${userId}:activeChat`);
  }
  async processNewMessage(
    connectionId: string, 
    receiverId: string, 
    message: CachedMessage, 
    eventType: string
  ) {
    const activeChat = await this.getActiveChat(receiverId);
    const tx = this.redis.multi(); 
    const chatKey = `chat:${connectionId}`;
    const unreadKey = `user:unread:${receiverId}`;
    tx.rpush(chatKey, JSON.stringify(message));
    tx.ltrim(chatKey, -50, -1);
    tx.expire(chatKey, 60 * 60 * 24);
    if (activeChat !== connectionId) {
      tx.hincrby(unreadKey, connectionId, 1);
    }
    const publishPayload = JSON.stringify({
      receiverId,
      eventType,
      eventData: message
    });
    tx.publish('chat_router', publishPayload);
    await tx.exec();
  }
  async seedMessages(connectionId:string, messages:CachedMessage[]){
    if (messages.length === 0) return;
    const key = `chat:${connectionId}`;
    const stringifiedMessages = messages.map(msg => JSON.stringify(msg));
    const tx = this.redis.multi();
    tx.rpush(key, ...stringifiedMessages);
    tx.expire(key, 60 * 60 * 24); 
    await tx.exec();
  }
  async getMessages(connectionId:string){
    const rawMessages = await this.redis.lrange(`chat:${connectionId}`, 0, -1);
    return rawMessages.map((msg) => JSON.parse(msg) as CachedMessage);
  }
  async seedUnreadCount(userId:string,unreadData:UnreadCountData[]){
    const key = `user:unread:${userId}`;
    const tx = this.redis.multi();
    tx.del(key); 
    if (unreadData.length > 0) {
      unreadData.forEach((data) => {
        tx.hset(key, data.connectionId, data.count);
      });
      tx.expire(key, 60 * 60 * 24);
    }
    await tx.exec();
  }
  async getUnread(userId:string){
    const rawMap = await this.redis.hgetall(`user:unread:${userId}`);
    const parsedMap: Record<string, number> = {};
    for (const [connId, countStr] of Object.entries(rawMap)) {
      parsedMap[connId] = parseInt(countStr, 10);
    }
    return parsedMap;
  }
  async setUnreadHydrateflag(userId:string) {
    await this.redis.set(`user:unread:hydrated:${userId}`, "1", "EX", 60 * 60 * 24);
  }
  async isUnreadHydrated(userId:string) {
    const exists = await this.redis.exists(`user:unread:hydrated:${userId}`);
    return exists === 1
  }
  async resetUnread(userId:string,connectionId:string){
    await this.redis.hdel(`user:unread:${userId}`,connectionId);
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