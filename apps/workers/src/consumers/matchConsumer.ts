import { redisManager } from "../config/redis";
import prisma, { ConnectionStatus } from "@matcha/prisma";
import { UserState } from "@matcha/redis";
import { logger } from "@matcha/logger";

interface MatchConstraints {
  radiusKm: number;
  maxScore: number;
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let isRunning = false;

function getMatchConstraints(waitTimeMs: number): MatchConstraints {
  if (waitTimeMs > 30000) return { radiusKm: 3000, maxScore: 1.0 };
  if (waitTimeMs > 20000) return { radiusKm: 2500, maxScore: 0.6 };
  if (waitTimeMs > 15000) return { radiusKm: 350,  maxScore: 0.5 };
  if (waitTimeMs > 10000) return { radiusKm: 80,   maxScore: 0.35 };
  if (waitTimeMs > 5000)  return { radiusKm: 80,   maxScore: 0.25 };
  return { radiusKm: 30, maxScore: 0.2 };
}
export async function startMatchmakingLoop() {
  isRunning = true;
  while (isRunning) {
    try {
      const usersInQueue = await redisManager.match.getUsersInQueue();
      if (usersInQueue.length < 2) {
        await sleep(2000);
        continue;
      }
      for (const searcherId of usersInQueue) {
        if (!isRunning) break;
        const profile = await redisManager.match.getSearcherProfile(searcherId);
        if (!profile || profile.queueStatus !== UserState.QUEUED) continue;
        const waitTimeMs = Date.now() - profile.queuedAt;
        const { radiusKm, maxScore } = getMatchConstraints(waitTimeMs);
        const potentialMatches = await redisManager.match.findMatchesInRadius(
          profile.searcherVector,
          profile.lat,
          profile.long,
          radiusKm
        );
        for (const candidate of potentialMatches) {
          if (candidate.id === searcherId || candidate.score > maxScore) continue;
          const locked = await redisManager.match.lockMatch(searcherId, candidate.id);
          if (locked) {
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
            const newConnection = await prisma.connection.create({
              data: {
                user1Id: searcherId,
                user2Id: candidate.id,
                status: ConnectionStatus.MATCHED,
                expiresAt: expiresAt,
              }
            });
            const baseEventData = {
              connectionId: newConnection.id,
              expiresAt: expiresAt.toISOString(),
            };
            await Promise.all([
              redisManager.chat.publish('chat_router', JSON.stringify({ 
                receiverId: searcherId, 
                eventType: "MATCH_FOUND", 
                eventData: { ...baseEventData, matchedUserId: candidate.id } 
              })),
              redisManager.chat.publish('chat_router', JSON.stringify({ 
                receiverId: candidate.id, 
                eventType: "MATCH_FOUND", 
                eventData: { ...baseEventData, matchedUserId: searcherId } 
              }))
            ]);
            break; 
          }
        }
      }
      await sleep(1000);
    } catch (error: any) {
      logger.error({ err: error }, "Matchmaking Loop Error");
      await sleep(5000);
    }
  }
}

export function stopMatchmakingLoop() {
  isRunning = false;
}