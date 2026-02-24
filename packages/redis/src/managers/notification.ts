import Redis from 'ioredis'
import { NotificationCategory } from '../common';

export class NotificationManager {
  constructor(private redis: Redis) {}

  async setNotificationFlag(userId: string, category: NotificationCategory) {
    const key = `user:notifications:${userId}`;
    const tx = this.redis.multi();
    tx.hset(key, category, "1"); 
    const publishPayload = JSON.stringify({
      receiverId: userId,
      eventType: 'NOTIFICATION_UPDATE',
      eventData: { category }
    });
    tx.publish('chat_router', publishPayload);
    await tx.exec();
  }
  async clearNotificationFlag(userId: string, category: NotificationCategory) {
    const key = `user:notifications:${userId}`;
    await this.redis.hdel(key, category);
  }
  async getNotificationFlags(userId: string): Promise<Record<string, string>> {
    const key = `user:notifications:${userId}`;
    return await this.redis.hgetall(key); 
  }
}