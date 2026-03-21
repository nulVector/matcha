import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { UserState } from '../../common';
import { MatchManager } from '../match';

describe('MatchManager Integration Tests', () => {
  let redis: Redis;
  let matchManager: MatchManager;

  beforeAll(() => {
    redis = new Redis(process.env.REDIS_URL!);
    matchManager = new MatchManager(redis);
  });
  afterAll(async () => {
    await redis.quit();
  });

  it('should add a user to the queue and retrieve their profile', async () => {
    await matchManager.updateMatchProfile('user_1', 28.7041, 77.1025, ['coding', 'gaming', 'movies']);
    await redis.hset('user:profile:user_1', {
      locationLatitude: '28.7041',
      locationLongitude: '77.1025'
    });
    await matchManager.addToQueue('user_1');
    const profile = await matchManager.getSearcherProfile('user_1');
    expect(profile).toBeDefined();
    expect(profile?.queueStatus).toBe(UserState.QUEUED);
    expect(profile?.lat).toBe(28.7041);
    expect(profile?.searcherVector.length).toBeGreaterThan(0); 
  });

  it('should find the closest match using HNSW vector search', async () => {
    await matchManager.updateMatchProfile('searcher', 28.7041, 77.1025, ['gaming', 'movies']);
    await redis.hset('user:profile:searcher', { locationLatitude: '28.7041', locationLongitude: '77.1025' });
    await matchManager.addToQueue('searcher');
    await matchManager.updateMatchProfile('perfect_match', 28.7041, 77.1025, ['gaming', 'movies']);
    await redis.hset('user:profile:perfect_match', { locationLatitude: '28.7041', locationLongitude: '77.1025' });
    await matchManager.addToQueue('perfect_match');
    await matchManager.updateMatchProfile('bad_match', 10.1632, 76.6413, ['travel', 'fitness']);
    await redis.hset('user:profile:bad_match', { locationLatitude: '10.1632', locationLongitude: '76.6413' });
    await matchManager.addToQueue('bad_match');
    const searcher = await matchManager.getSearcherProfile('searcher');
    const matches = await matchManager.findMatchesInRadius(
      searcher!.searcherVector,
      searcher!.lat,
      searcher!.long,
      50 
    );
    const validMatches = matches.filter(m => m.id !== 'searcher');
    expect(validMatches.length).toBeGreaterThan(0);
    expect(validMatches[0]!.id).toBe('perfect_match');
    const hasBadMatch = matches.some(m => m.id === 'bad_match');
    expect(hasBadMatch).toBe(false);
  });

  it('should successfully lock a match and update statuses', async () => {
    await matchManager.addToQueue('user_a');
    await matchManager.addToQueue('user_b');
    await redis.set('user:status:user_a', Date.now().toString());
    await redis.set('user:status:user_b', Date.now().toString());
    const locked = await matchManager.lockMatch('user_a', 'user_b');
    expect(locked).toBe(true);
    const statusA = await redis.hget('user:profile:user_a', 'queueStatus');
    const statusB = await redis.hget('user:profile:user_b', 'queueStatus');
    expect(statusA).toBe(UserState.MATCHED);
    expect(statusB).toBe(UserState.MATCHED);
    const queue = await matchManager.getUsersInQueue();
    expect(queue).not.toContain('user_a');
    expect(queue).not.toContain('user_b');
  });
});