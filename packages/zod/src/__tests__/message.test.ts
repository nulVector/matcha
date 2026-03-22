import { describe, expect, it } from 'vitest';
import { getChatHistorySchema } from '../schemas/message';

describe('Message Zod Schemas', () => {
  describe('getChatHistorySchema', () => {
    it('should pass with valid cursor and limit', () => {
      const result = getChatHistorySchema.safeParse({ cursor: 'msg_123', limit: 20 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it('should inject the default limit (50) when omitted', () => {
      const result = getChatHistorySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it('should coerce string numbers to integers', () => {
      const result = getChatHistorySchema.safeParse({ limit: '30' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(30);
      }
    });

    it('should enforce min (1) and max (100) boundaries', () => {
      const tooLow = getChatHistorySchema.safeParse({ limit: 0 });
      const tooHigh = getChatHistorySchema.safeParse({ limit: 101 });
      expect(tooLow.success).toBe(false);
      expect(tooHigh.success).toBe(false);
    });
  });
});