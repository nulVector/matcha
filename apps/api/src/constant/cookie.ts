import { env } from "../config/env";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const, 
  maxAge: 7 * 24 * 60 * 60 * 1000,
  domain: env.NODE_ENV === 'production' ? '.trymatcha.in' : undefined
};