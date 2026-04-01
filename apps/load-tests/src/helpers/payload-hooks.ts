import { createId } from '@paralleldrive/cuid2';

export function generateMessagePayload(context: any, events: any, done: Function) {
  try {
    if (!context.vars) context.vars = {};
    const sender = context.vars.userProfileId || "Unknown";
    context.vars.chatMessage = `Load test message from ${sender} at ${Date.now()}`;
    done();
  } catch (err) {
    done(err);
  }
}