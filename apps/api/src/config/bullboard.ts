import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import basicAuth from 'express-basic-auth';
import { taskQueue, dbBufferQueue, cronQueue, dlqQueue } from '@matcha/queue';
import { RequestHandler } from 'express';
import { env } from './env';

const username = env.ADMIN_USERNAME;
const password = env.ADMIN_PASSWORD;

export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues/dashboard');
createBullBoard({
  queues: [
    new BullMQAdapter(taskQueue),
    new BullMQAdapter(dbBufferQueue),
    new BullMQAdapter(cronQueue),
    new BullMQAdapter(dlqQueue),
  ],
  serverAdapter: serverAdapter,
});
export const adminAuth: RequestHandler = basicAuth({
  users: {
    [username]: password
  },
  challenge: true,
  unauthorizedResponse: 'Unauthorized: Invalid Admin Credentials'
});