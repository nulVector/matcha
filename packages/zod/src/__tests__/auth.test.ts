import { describe, expect, it } from 'vitest';
import {
  deactivatePasswordSchema,
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  signupSchema,
  updatePasswordSchema
} from '../schemas/auth';

describe('Auth Zod Schemas', () => {
  describe('signupSchema', () => {
    it('should pass with valid email, strong password, and matching confirmPassword', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: 'ValidPassword123',
        confirmPassword: 'ValidPassword123'
      });
      expect(result.success).toBe(true);
    });

    it('should fail on invalid email formats', () => {
      const result = signupSchema.safeParse({
        email: 'not-an-email',
        password: 'ValidPassword123',
        confirmPassword: 'ValidPassword123'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid email address');
      }
    });

    it('should enforce password complexity (missing uppercase)', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: 'weakpassword1',
        confirmPassword: 'weakpassword1'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('at least one number, one uppercase, and one lowercase');
      }
    });

    it('should enforce password length limits', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: 'Short1!',
        confirmPassword: 'Short1!'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Password must be at least 8 characters');
      }
    });

    it('should fail when passwords do not match via .refine()', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: 'ValidPassword123',
        confirmPassword: 'DifferentPassword123'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Passwords do not match');
        expect(result.error.issues[0]?.path).toEqual(['confirmPassword']);
      }
    });
  });

  describe('loginSchema', () => {
    it('should pass with valid email and any non-empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'oldpassword' 
      });
      expect(result.success).toBe(true);
    });

    it('should fail with an empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '   '
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Password is required');
      }
    });
  });

  describe('updatePasswordSchema', () => {
    it('should pass with valid new password', () => {
      const result = updatePasswordSchema.safeParse({
        currentPassword: 'OldPassword123',
        newPassword: 'NewValidPassword456'
      });
      expect(result.success).toBe(true);
    });

    it('should fail if new password is the same as current password', () => {
      const result = updatePasswordSchema.safeParse({
        currentPassword: 'SamePassword123',
        newPassword: 'SamePassword123'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('New password must be different from current password');
        expect(result.error.issues[0]?.path).toEqual(['newPassword']);
      }
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate the token presence and matching passwords', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'Random-token',
        password: 'NewStrongPassword1',
        confirmPassword: 'NewStrongPassword1'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('requestPasswordReset & deactivatePassword Schemas', () => {
    it('requestPasswordResetSchema should validate just an email', () => {
      const valid = requestPasswordResetSchema.safeParse({ email: 'hello@world.com' });
      const invalid = requestPasswordResetSchema.safeParse({ email: 'not-an-email' });
      expect(valid.success).toBe(true);
      expect(invalid.success).toBe(false);
    });

    it('deactivatePasswordSchema should allow optional passwords', () => {
      const withPass = deactivatePasswordSchema.safeParse({ password: 'mypassword' });
      const withoutPass = deactivatePasswordSchema.safeParse({});
      expect(withPass.success).toBe(true);
      expect(withoutPass.success).toBe(true);
    });
  });
});