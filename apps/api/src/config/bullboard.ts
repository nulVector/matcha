import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import basicAuth from 'express-basic-auth';
import { taskQueue, dbBufferQueue, cronQueue } from '@matcha/queue';
import { RequestHandler } from 'express';

export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues/dashboard');
createBullBoard({
  queues: [
    new BullMQAdapter(taskQueue),
    new BullMQAdapter(dbBufferQueue),
    new BullMQAdapter(cronQueue),
  ],
  serverAdapter: serverAdapter,
});
export const adminAuth: RequestHandler = basicAuth({
  users: {
    [process.env.ADMIN_USERNAME || 'admin']: process.env.ADMIN_PASSWORD || 'supersecret'
  },
  challenge: true,
  unauthorizedResponse: 'Unauthorized: Invalid Admin Credentials'
});