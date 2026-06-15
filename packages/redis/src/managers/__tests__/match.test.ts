import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { UserState } from '../../common';
import { MatchManager } from '../match';
import { createRedisClient, type RedisClient } from '../../index';

describe('MatchManager Integration Tests', () => {
  let matchClient: RedisClient;
  let matchManager: MatchManager;

  beforeAll(() => {
    matchClient = createRedisClient(process.env.REDIS_URL!, "MATCH");
    matchManager = new MatchManager(matchClient);
  });
  afterAll(async () => {
    await matchClient.quit();
  });

  it('should add a user to the queue and retrieve their profile', async () => {
    await matchManager.updateMatchProfile('user_1', 28.7041, 77.1025, ['coding', 'gaming', 'movies']);
    await matchClient.hset('user:profile:user_1', {
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
    await matchClient.hset('user:profile:searcher', { locationLatitude: '28.7041', locationLongitude: '77.1025' });
    await matchManager.addToQueue('searcher');
    await matchManager.updateMatchProfile('perfect_match', 28.7041, 77.1025, ['gaming', 'movies']);
    await matchClient.hset('user:profile:perfect_match', { locationLatitude: '28.7041', locationLongitude: '77.1025' });
    await matchManager.addToQueue('perfect_match');
    await matchManager.updateMatchProfile('bad_match', 10.1632, 76.6413, ['travel', 'fitness']);
    await matchClient.hset('user:profile:bad_match', { locationLatitude: '10.1632', locationLongitude: '76.6413' });
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
    await matchClient.set('user:status:user_a', Date.now().toString());
    await matchClient.set('user:status:user_b', Date.now().toString());
    const locked = await matchManager.lockMatch('user_a', 'user_b');
    expect(locked).toBe(true);
    const statusA = await matchClient.hget('user:profile:user_a', 'queueStatus');
    const statusB = await matchClient.hget('user:profile:user_b', 'queueStatus');
    expect(statusA).toBe(UserState.MATCHED);
    expect(statusB).toBe(UserState.MATCHED);
    const queue = await matchManager.getUsersInQueue();
    expect(queue).not.toContain('user_a');
    expect(queue).not.toContain('user_b');
  });
});