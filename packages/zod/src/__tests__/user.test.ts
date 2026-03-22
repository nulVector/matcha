import { describe, expect, it } from 'vitest';
import {
  connectionIdSchema,
  getConnectionsListSchema,
  getFriendRequestsSchema,
  initiateProfileSchema,
  requestHandleSchema,
  sendRequestSchema,
  updateProfileSchema,
  userIdSchema,
  usernameCheckSchema,
  vibeCheck
} from '../schemas/user';

const validCuid2 = 'tz4a98xxat96iwsdz6jivndk';

describe('User Zod Schemas', () => {
  
  describe('usernameCheckSchema', () => {
    it('should pass with a valid, lowercase, alphanumeric username', () => {
      const result = usernameCheckSchema.safeParse({ username: 'valid_user_123' });
      expect(result.success).toBe(true);
    });

    it('should safely auto-convert uppercase letters to lowercase', () => {
      const result = usernameCheckSchema.safeParse({ username: 'Valid_User_123' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('valid_user_123'); 
      }
    });

    it('should fail if username contains special characters or spaces (regex check)', () => {
      const result = usernameCheckSchema.safeParse({ username: 'invalid-user!' }); 
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Username can only contain lowercase letters, numbers, and underscores');
      }
    });

    it('should enforce length limits (min 5, max 30)', () => {
      const short = usernameCheckSchema.safeParse({ username: 'abc' });
      const long = usernameCheckSchema.safeParse({ username: 'a'.repeat(31) });
      expect(short.success).toBe(false);
      expect(short.error?.issues[0]?.message).toBe('Username must be at least 5 characters');
      expect(long.success).toBe(false);
      expect(long.error?.issues[0]?.message).toBe('Username is too long');
    });

    it('should trim whitespace before validating', () => {
      const result = usernameCheckSchema.safeParse({ username: '  hello_world  ' });
      expect(result.success).toBe(true);
    });
  });

  describe('initiateProfileSchema', () => {
    const validProfile = {
      username: 'gamer_dude_99',
      avatarUrl: 'https://example.com/avatar.png',
      aboutMe: 'I love writing code.',
      location: 'Bengaluru',
      locationLatitude: 12.9716,
      locationLongitude: 77.5946,
      interest: ['coding', 'pc gaming', 'gym']
    };

    it('should pass with a complete, valid profile', () => {
      const result = initiateProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should fail with invalid geographic coordinates', () => {
      const result = initiateProfileSchema.safeParse({
        ...validProfile,
        locationLatitude: 100,
        locationLongitude: -200
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.issues.map(i => i.message);
        expect(errors).toContain('Invalid latitude');
        expect(errors).toContain('Invalid longitude');
      }
    });

    it('should enforce interest array limits (min 3, max 10)', () => {
      const notEnough = initiateProfileSchema.safeParse({ ...validProfile, interest: ['coding'] });
      const tooMany = initiateProfileSchema.safeParse({ ...validProfile, interest: Array(11).fill('coding') });
      expect(notEnough.success).toBe(false);
      expect(notEnough.error?.issues[0]?.message).toBe('Select minimum 3 interests.');
      expect(tooMany.success).toBe(false);
      expect(tooMany.error?.issues[0]?.message).toBe('Up to only 10 can be selected.');
    });
  });

  describe('List and Pagination Schemas', () => {
    it('getConnectionsListSchema should validate enums and coercing defaults', () => {
      const result = getConnectionsListSchema.safeParse({ status: 'FRIEND', limit: '30' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(30);
      }
      const invalidStatus = getConnectionsListSchema.safeParse({ status: 'NOT_FRIEND' });
      expect(invalidStatus.success).toBe(false);
      expect(invalidStatus.error?.issues[0]?.message).toBe("Must be either 'FRIEND' or 'ARCHIVED'");
    });

    it('getFriendRequestsSchema should validate incoming/outgoing enums', () => {
      const result = getFriendRequestsSchema.safeParse({ type: 'incoming' });
      expect(result.success).toBe(true);
    });
  });

  describe('CUID2 Identifiers', () => {
    it('should validate correctly formatted CUIDs', () => {
      const result = userIdSchema.safeParse({ userId: validCuid2 });
      expect(result.success).toBe(true);
    });

    it('should reject invalid CUIDs', () => {
      const result = connectionIdSchema.safeParse({ connectionId: 'invalid-id-format' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe('Invalid ID format');
    });
  });

  describe('sendRequestSchema (.refine logic)', () => {
    it('should pass when origin is SEARCH (no connectionId needed)', () => {
      const result = sendRequestSchema.safeParse({ origin: 'SEARCH' });
      expect(result.success).toBe(true);
    });

    it('should pass when origin is ARCHIVE and connectionId IS provided', () => {
      const result = sendRequestSchema.safeParse({ 
        origin: 'ARCHIVE', 
        connectionId: validCuid2 
      });
      expect(result.success).toBe(true);
    });

    it('should fail when origin is ARCHIVE but connectionId is MISSING', () => {
      const result = sendRequestSchema.safeParse({ origin: 'ARCHIVE' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('connectionId is required when origin is ARCHIVE');
        expect(result.error.issues[0]?.path).toEqual(['connectionId']);
      }
    });
  });

  describe('requestHandleSchema & vibeCheck', () => {
    it('requestHandleSchema should only accept ACCEPT or REJECT', () => {
      expect(requestHandleSchema.safeParse({ action: 'ACCEPT' }).success).toBe(true);
      expect(requestHandleSchema.safeParse({ action: 'REJECT' }).success).toBe(true);
      expect(requestHandleSchema.safeParse({ action: 'IGNORE' }).success).toBe(false);
    });

    it('vibeCheck should only accept predefined vibes', () => {
      expect(vibeCheck.safeParse({ vibe: 'chaos' }).success).toBe(true);
      expect(vibeCheck.safeParse({ vibe: 'boring' }).success).toBe(false);
    });
  });

});