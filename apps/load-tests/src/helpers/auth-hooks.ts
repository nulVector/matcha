import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { createId } from '@paralleldrive/cuid2';

const REDIS_URL = process.env.REDIS_URL;
const JWT_SECRET = process.env.JWT_SECRET;
if (!REDIS_URL || !JWT_SECRET) {
  throw new Error("Missing Environment variable.");
}
const redisClient = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

export function setupUser(params: any, context: any, done: Function) {
  Promise.resolve().then(async () => {
    const userData = await redisClient.lpop('artillery:users:queue');
    if (!userData) {
      throw new Error("Redis queue ran out of users.");
    }
    const [userId, profileId, connectionId, receiverId, messageId] = userData.split(',');
    if (!userId || !profileId) {
      throw new Error("Malformed user data popped from Redis!");
    }
    const sessionId = createId();
    const tokenVersion = 1;
    const sessionData = {
      userId,
      tokenVersion,
      userProfileId: profileId,
      hasPassword: true
    };
    await redisClient.set(`session:${userId}:${sessionId}`, JSON.stringify(sessionData), 'EX', 60 * 30);
    
    const token = jwt.sign(
      { id: userId, sessionId, tokenVersion },
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

export function cleanupSession(context: any, events: any, done: Function) {
  Promise.resolve().then(async () => {
    const { userId, sessionId } = context.vars;
    if (userId && sessionId) {
      await redisClient.del(`session:${userId}:${sessionId}`);
    }
    done();
  }).catch((err) => {
    console.error("Cleanup Error:", err);
    done(err);
  });
}