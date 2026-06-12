import { createId } from '@paralleldrive/cuid2';
import type { ArtilleryContext, DoneCallback } from './auth-hooks';

export function generateMessagePayload(context: ArtilleryContext, events: unknown, done: DoneCallback) {
  try {
    if (!context.vars) context.vars = {};
    const sender = context.vars.userProfileId || "Unknown";
    context.vars.chatMessage = `Load test message from ${sender} at ${Date.now()}`;
    done();
  } catch (err) {
    done(err);
  }
}