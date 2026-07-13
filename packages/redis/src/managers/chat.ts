import Redis from "ioredis";
import { UnreadCountData } from "../common";
import { CachedMessage } from "@matcha/shared";

export class ChatManager {
  constructor (private redis:Redis, private pubRedis:Redis) {}

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
    eventType: string,
    traceId?: string
  ) {
    const activeChat = await this.getActiveChat(receiverId);
    const tx = this.redis.multi(); 
    const chatKey = `chat:${connectionId}`;
    const unreadKey = `user:unread:${receiverId}`;
    tx.rpush(chatKey, JSON.stringify(message));
    tx.ltrim(chatKey, -50, -1);
    tx.expire(chatKey, 60 * 60 * 24);
    tx.rpush("buffer:messages", JSON.stringify(message));
    if (activeChat !== connectionId) {
      tx.hincrby(unreadKey, connectionId, 1);
    }
    await tx.exec();
    const publishPayload = JSON.stringify({
      receiverId,
      eventType,
      eventData: message,
      traceId
    });
    await this.pubRedis.publish('chat_router', publishPayload);
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
    const parsedMessages: CachedMessage[] = [];
    for (const msg of rawMessages) {
      try {
        parsedMessages.push(JSON.parse(msg) as CachedMessage);
      } catch (err) {
        // Ignored intentionally
      }
    }
    return parsedMessages;
  }
  async hideChat(connectionId:string) {
    await this.redis.set(`chat:hidden:${connectionId}`,"1");
  }
  async checkAndUnhideChat(connectionId:string){
    const key = `chat:hidden:${connectionId}`;
    const deletedCount = await this.redis.del(key);
    return deletedCount === 1;
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
  async getMessageBufferBatch(batchSize: number): Promise<CachedMessage[]> {
    const rawMessages = await this.redis.lrange("buffer:messages", 0, batchSize - 1);
    return rawMessages.map(msg => JSON.parse(msg) as CachedMessage);
  }
  async trimMessageBufferBatch(batchSize: number) {
    await this.redis.ltrim("buffer:messages", batchSize, -1);
  }
  async bufferReadReceipt(connectionId: string, userId: string, messageId: string, traceId?: string) {
    const payload = JSON.stringify({
      messageId,
      readAt: new Date().toISOString(),
      traceId
    });
    await this.redis.hset("buffer:reads", `${connectionId}:${userId}`, payload);
  }
  async extractReadReceiptBuffer(): Promise<Record<string, string> | null> {
    const tempKey = `buffer:reads:processing:${Date.now()}`;
    try {
      await this.redis.rename("buffer:reads", tempKey);
      const data = await this.redis.hgetall(tempKey);
      await this.redis.del(tempKey);
      return data;
    } catch (error: any) {
      if (error.message.includes("no such key")) {
        return null; 
      }
      throw error;
    }
  }
  async publish(channel:string,msg:string){
    return await this.pubRedis.publish(channel,msg);
  }
}