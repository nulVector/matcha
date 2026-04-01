import { createId } from '@paralleldrive/cuid2';
import { Agent, setGlobalDispatcher } from 'undici';

const agent = new Agent({
  connections: 200,
  pipelining: 10
});
setGlobalDispatcher(agent);
export async function joinMatchmakingQueue(context: any, events: any) {
  try {
    const { token } = context.vars;
    const API_URL = process.env.API_URL || 'http://127.0.0.1:8080';
    const idempotencyKey = createId();

    const response = await fetch(`${API_URL}/api/v1/connections/queue/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`,
        'x-idempotency-key': idempotencyKey 
      },
      body: JSON.stringify({}) 
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[HTTP] Failed to join queue: ${response.status} - ${text}`);
    }
  } catch (err) {
    console.error("Matchmaking Hook Error:", err);
  }
}