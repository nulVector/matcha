import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import basicAuth from 'express-basic-auth';
import { taskQueue, dbBufferQueue, cronQueue, dlqQueue } from '@matcha/queue';
import { RequestHandler } from 'express';

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;
if(!username || !password){
  throw new Error("Environment variables not available");
}

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