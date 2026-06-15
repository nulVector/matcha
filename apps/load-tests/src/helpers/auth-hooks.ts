import jwt from 'jsonwebtoken';
import { createId } from '@paralleldrive/cuid2';
import { createRedisClient, AuthManager, RedisClient } from '@matcha/redis';

const REDIS_URL = process.env.REDIS_URL;
const JWT_SECRET = process.env.JWT_SECRET;
if (!REDIS_URL || !JWT_SECRET) {
  throw new Error("Missing Environment variable.");
}
const systemClient: RedisClient = createRedisClient(REDIS_URL, "SYSTEM");
const sessionClient: RedisClient = createRedisClient(REDIS_URL, "SESSION");
const authManager = new AuthManager(sessionClient);

export interface ArtilleryContext {
  vars: Record<string, string | undefined>;
}
export interface RequestParams {
  target: string;
  [key: string]: unknown;
}
export type DoneCallback = (err?: Error | unknown) => void;

export function setupUser(params: RequestParams, context: ArtilleryContext, done: DoneCallback) {
  Promise.resolve().then(async () => {
    const userData = await systemClient.lpop('artillery:users:queue');
    if (!userData) {
      throw new Error("Redis queue ran out of users.");
    }
    const [userId, profileId, connectionId, receiverId, messageId] = userData.split(',');
    if (!userId || !profileId) {
      throw new Error("Malformed user data popped from Redis!");
    }
    const sessionId = createId();
    const sessionData = {
      userId,
      userProfileId: profileId,
      hasPassword: true
    };
    await authManager.cacheSession(userId, sessionId, profileId, true);
    
    const token = jwt.sign(
      { id: userId, sessionId },
      JWT_SECRET!,
      { expiresIn: '2h' }
    );
    const separator = params.target.includes('?') ? '&' : '?';
    params.target = `${params.target}${separator}token=${token}`;
    
    context.vars.token = token;
    context.vars.sessionId = sessionId;
    context.vars.userId = userId;
    context.vars.userProfileId = profileId;
    
    if (connectionId && receiverId) {
      context.vars.connectionId = connectionId;
      context.vars.receiverId = receiverId;
      context.vars.messageId = messageId;
    }
    done();
  }).catch((err) => {
    console.error("Setup Hook Error:", err);
    done(err);
  });
}

export function cleanupSession(context: ArtilleryContext, events: unknown, done: DoneCallback) {
  Promise.resolve().then(async () => {
    const { userId, sessionId } = context.vars;
    if (userId && sessionId) {
      await sessionClient.del(`session:${userId}:${sessionId}`);
    }
    done();
  }).catch((err) => {
    console.error("Cleanup Error:", err);
    done(err);
  });
}