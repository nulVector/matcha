import Redis from 'ioredis'
import { NotificationCategory } from '../common';

export class NotificationManager {
  constructor(private redis: Redis) {}

  async incrNotification(userId: string, category: NotificationCategory, amount: number = 1) {
    const key = `user:notifications:${userId}`;
    const tx = this.redis.multi();
    tx.hincrby(key, category, amount);
    const publishPayload = JSON.stringify({
      receiverId: userId,
      eventType: 'NOTIFICATION_UPDATE',
      eventData: { category }
    });
    tx.publish('chat_router', publishPayload);
    await tx.exec();
  }

  async resetNotification(userId: string, category: NotificationCategory) {
    const key = `user:notifications:${userId}`;
    await this.redis.hset(key, category, 0);
  }

  async getAllNotifications(userId: string): Promise<Record<string, string>> {
    const key = `user:notifications:${userId}`;
    return await this.redis.hgetall(key); 
  }
}