import { describe, expect, it } from 'vitest';
import { CategorySchema } from '../schemas/notification';

describe('Notification Zod Schemas', () => {
  describe('CategorySchema', () => {
    it('should pass with a valid notification category', () => {
      const result = CategorySchema.safeParse({ category: 'new_friend_request' });
      expect(result.success).toBe(true);
    });

    it('should fail with an unknown or invalid category', () => {
      const result = CategorySchema.safeParse({ category: 'unknown_category_type' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Invalid input: expected "new_friend_request"');
      }
    });
  });
});