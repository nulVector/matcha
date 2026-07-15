import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BloomFilterManager } from '../bloom';
import { createRedisClient, type RedisClient } from '../../index';

describe('BloomFilterManager Integration Tests', () => {
  let bloomClient: RedisClient;
  let bloomManager: BloomFilterManager;
  const testKey = 'test:bloom:pairs';

  beforeAll(async () => {
    bloomClient = createRedisClient(process.env.REDIS_URL!, 'CACHE');
    bloomManager = new BloomFilterManager(bloomClient);
  });
  beforeEach(async () => {
    await bloomManager.reserve(testKey, 0.01, 1000);
  });
  afterAll(async () => {
    await bloomClient.del(testKey);
    await bloomClient.quit();
  });

  it('should reserve a filter without throwing if it already exists', async () => {
    await expect(bloomManager.reserve(testKey, 0.01, 1000)).resolves.not.toThrow();
  });

  it('should add an item and confirm it exists', async () => {
    const added = await bloomManager.add(testKey, 'user_a:user_b');
    expect(added).toBe(true);

    const exists = await bloomManager.exists(testKey, 'user_a:user_b');
    expect(exists).toBe(true);
  });

  it('should report false for an item never added', async () => {
    const exists = await bloomManager.exists(testKey, 'never_added_pair');
    expect(exists).toBe(false);
  });

  it('addPair/existsPair should be order-independent for the same two ids', async () => {
    await bloomManager.addPair(testKey, 'user_1', 'user_2');

    const forward = await bloomManager.existsPair(testKey, 'user_1', 'user_2');
    const reversed = await bloomManager.existsPair(testKey, 'user_2', 'user_1');

    expect(forward).toBe(true);
    expect(reversed).toBe(true);
  });

  it('existsPair should be false for a pair that was never added', async () => {
    const exists = await bloomManager.existsPair(testKey, 'user_x', 'user_y');
    expect(exists).toBe(false);
  });
});
