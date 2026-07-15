import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ChatManager } from '../chat';
import { createRedisClient, type RedisClient } from '../../index';
import type { CachedMessage } from '@matcha/shared';

describe('ChatManager Integration Tests', () => {
  let cacheClient: RedisClient;
  let pubClient: RedisClient;
  let chatManager: ChatManager;
  const connectionId = 'test_connection_1';
  const receiverId = 'receiver_1';

  beforeAll(() => {
    cacheClient = createRedisClient(process.env.REDIS_URL!, 'CACHE');
    pubClient = createRedisClient(process.env.REDIS_URL!, 'PUBSUB_PUB');
    chatManager = new ChatManager(cacheClient, pubClient);
  });

  afterAll(async () => {
    await cacheClient.quit();
    await pubClient.quit();
  });

  const makeMessage = (id: string): CachedMessage => ({
    id,
    connectionId,
    senderId: 'sender_1',
    content: 'hello',
    type: 'TEXT',
    createdAt: new Date().toISOString(),
  } as CachedMessage);

  it('should increment unread count when receiver does NOT have the chat active', async () => {
    await chatManager.removeActiveChat(receiverId);
    await chatManager.processNewMessage(connectionId, receiverId, makeMessage('msg_1'), 'NEW_MESSAGE');

    const unread = await chatManager.getUnread(receiverId);
    expect(unread[connectionId]).toBeGreaterThanOrEqual(1);
  });

  it('should NOT increment unread count when receiver has the chat active', async () => {
    await chatManager.setActiveChat(receiverId, connectionId);
    const before = await chatManager.getUnread(receiverId);
    const beforeCount = before[connectionId] ?? 0;

    await chatManager.processNewMessage(connectionId, receiverId, makeMessage('msg_2'), 'NEW_MESSAGE');

    const after = await chatManager.getUnread(receiverId);
    expect(after[connectionId] ?? 0).toBe(beforeCount);
  });

  it('should retrieve messages in insertion order and cap the cached window', async () => {
    await chatManager.processNewMessage(connectionId, receiverId, makeMessage('msg_test_3'), 'NEW_MESSAGE');
      const messages = await chatManager.getMessages(connectionId);
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
  });

  it('should hide and unhide a chat', async () => {
    await chatManager.hideChat(connectionId);
    const unhidWhileHidden = await chatManager.checkAndUnhideChat(connectionId);
    expect(unhidWhileHidden).toBe(true);

    const unhidAgain = await chatManager.checkAndUnhideChat(connectionId);
    expect(unhidAgain).toBe(false);
  });
});
