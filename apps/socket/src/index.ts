import { TaskProducer } from '@matcha/queue';
import { UserState, ConnectionListType } from '@matcha/redis';
import { createServer, IncomingMessage, Server } from 'http';
import jwt from 'jsonwebtoken';
import prisma, { ConnectionStatus } from '@matcha/prisma';
import { WebSocket, WebSocketServer } from 'ws';
import { redisManager } from './services/redis';
import { createId } from '@paralleldrive/cuid2';
import { logger } from '@matcha/logger';
import { JwtPayload, UserSession, EventType, SystemAction, CachedMessage, MessageType } from "@matcha/shared"
import { socketMessageSchema } from '@matcha/zod';

interface AuthenticatedWebSocket extends WebSocket {
  isAlive: boolean;
  userId: string;
  sessionId: string;
  exp: number;
}

const server = createServer((req, res) => {
  res.writeHead(200);
  res.end("WebSocket Server Running");
});
const wss = new WebSocketServer({noServer:true});
const jwtSecret = process.env.JWT_SECRET;
const PORT = Number(process.env.WS_PORT) || 8080;
const localSockets = new Map<string,Set<WebSocket>>();

if(!jwtSecret){
  throw new Error("Environment variables not availble");
}
const parseCookies = (cookieString:string) => {
  if (!cookieString) return {};
  return cookieString.split(';').reduce((res,items)=>{
    const [key, value] = items.trim().split("=");
    if (key) {
      res[key] = value || ""; 
    }
    return res;
  }, {} as Record<string, string>);
}
server.on('upgrade',async (request,socket,head)=>{
  try {
    const cookies = parseCookies(request.headers.cookie || "");
    let token = cookies.token;
    // For passing cookies during Artillery testing
    if (!token && process.env.ARTILLERY_TEST === "true") {
      const url = new URL(request.url || "", `http://${request.headers.host}`);
      token = url.searchParams.get('token') || undefined;
    }
    if(!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    const jwt_payload = jwt.verify(token,jwtSecret) as JwtPayload;
    const userSession = await redisManager.auth.getSession(jwt_payload.id, jwt_payload.sessionId);
    if (!userSession){
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request,socket,head,(ws)=>{
      wss.emit('connection',ws,request,userSession,jwt_payload);
    })
  } catch (err) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
})
wss.on('connection', async (ws:WebSocket, _request:IncomingMessage, userSession:UserSession, jwtPayload: JwtPayload)=>{
  const profileId = userSession.userProfileId;
  if (!profileId) {
    ws.close(1008, "Profile required to connect");
    return;
  }
  const socketId = createId(); 
  const authWs = ws as AuthenticatedWebSocket;
  authWs.isAlive = true;
  authWs.userId = jwtPayload.id;
  authWs.sessionId = jwtPayload.sessionId;
  authWs.exp = jwtPayload.exp;
  if (!localSockets.has(profileId)) localSockets.set(profileId, new Set());
  localSockets.get(profileId)!.add(authWs);
  try {
    await redisManager.userConnection.mapSocket(profileId,socketId);
    const profileData = await redisManager.userDetail.getProfileFields(profileId, ["queueStatus"]);
    if (profileData.queueStatus === UserState.MATCHED) {
      const activeConnection = await prisma.connection.findFirst({
        where: {
          status: "MATCHED",
          OR: [{ user1Id: profileId }, { user2Id: profileId }]
        },
        select: { id: true, user1Id: true, user2Id: true }
      });
      if (activeConnection) {
        const partnerId = activeConnection.user1Id === profileId ? activeConnection.user2Id : activeConnection.user1Id;
        const traceId = createId();
        logger.info({ traceId, profileId, connectionId: activeConnection.id }, "User reconnected during match");
        await redisManager.chat.publish(
          'chat_router',
          JSON.stringify({
            receiverId: partnerId,
            eventType: EventType.SYSTEM_EVENT,
            eventData: { 
              event: SystemAction.PARTNER_ONLINE, 
              connectionId: activeConnection.id 
            },
            traceId
          })
        );
      }
    }
  } catch (err: any) {
    logger.error({ err, profileId }, "Failed to initialize connection");
    ws.close();
    return;
  }
  authWs.on('pong', async () => {
    authWs.isAlive = true;
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > authWs.exp) {
      logger.warn({ profileId }, "Token expired. Forcing disconnect.");
      return authWs.close(4001, "Token Expired");
    }
    try {
      const isValidSession = await redisManager.userConnection.validateAndUpdatePresence(
        authWs.userId, 
        authWs.sessionId,
        profileId
      );
      if (!isValidSession) {
        logger.warn({profileId},"Session revoked. Forcing disconnect.")
        return authWs.close(4001, "Session Revoked");  
      }
    } catch (err: any) {
      logger.error({ err, profileId }, "Heartbeat update failed/validation failed");
    }
  });
  authWs.on('message', async (rawMessage: Buffer) => {
    const isRateLimited = await redisManager.auth.checkRateLimit(`ws:msg:${socketId}`, 100, 5);
    if (isRateLimited) {
      logger.warn({ profileId, socketId }, "WebSocket rate limit exceeded.");
      return;
    }
    let parsedJson;
    try {
      parsedJson = JSON.parse(rawMessage.toString());
    } catch (err: any) {
      logger.warn({ err, profileId }, "Malformed JSON received");
      return;
    }
    const validation = socketMessageSchema.safeParse(parsedJson);
    if (!validation.success){
      logger.warn({ 
        profileId, 
        errors: validation.error.issues.map(err=>err.message)
      }, "Invalid socket payload");
      return;
    }
    const parsedData = validation.data;
    const traceId = parsedData.traceId || 'no-trace-id';

    try {
      logger.info({ profileId, traceId, type: parsedData.type }, "Received WS message");
      switch (parsedData.type) {
        case EventType.SEND_MESSAGE: {
          const { connectionId, receiverId, content } = parsedData.payload;
          const [matchInfo, connInfo] = await Promise.all([
            redisManager.match.getMatchInfo(connectionId),
            redisManager.userConnection.getConnectionInfo(connectionId)
          ]);
          if (connInfo?.status === ConnectionListType.ARCHIVED) {
            logger.warn({ profileId, connectionId }, "Attempted to send message to an archived chat");
            return;
          }
          if (!matchInfo && !connInfo) {
            logger.warn({ profileId, connectionId }, "Attempted to send message to an unknown chat");
            return;
          }
          const message: CachedMessage = {
            id: createId(),
            connectionId,
            content,
            senderId: profileId,
            createdAt: new Date().toISOString(),
            type: MessageType.TEXT,
            traceId
          };
          const wasHidden = await redisManager.chat.checkAndUnhideChat(connectionId);
          if (wasHidden){
            await prisma.connection.update({
              where:{
                id:connectionId
              }, data: {
                user1ChatVisible: true,
                user2ChatVisible: true,
                updatedAt: new Date()
              }
            })
          }
          await redisManager.chat.processNewMessage(
            connectionId, 
            receiverId, 
            message, 
            EventType.NEW_MESSAGE,
            traceId
          );
          await redisManager.chat.publish(
            'chat_router',
            JSON.stringify({
              receiverId: profileId, 
              eventType: EventType.NEW_MESSAGE,
              eventData: message,
              traceId
            })
          );
          break;
        }
        case EventType.START_TYPING: {
          const { connectionId, receiverId} = parsedData.payload;
          await redisManager.chat.publish(
            'chat_router',
            JSON.stringify({
              receiverId,
              eventType:EventType.USER_TYPING,
              eventData:{
                senderId:profileId,
                connectionId
              },
              traceId
            })
          )
          break;
        }
        case EventType.STOP_TYPING: {
          const { connectionId, receiverId } = parsedData.payload;
          await redisManager.chat.publish(
            'chat_router',
            JSON.stringify({
              receiverId,
              eventType: EventType.USER_STOPPED_TYPING,
              eventData: {
                senderId: profileId,
                connectionId
              },
              traceId
            })
          );
          break;
        }
        case EventType.VIEW_CHAT: {
          const { connectionId, receiverId, lastMessageId } = parsedData.payload;
          await Promise.all([
            redisManager.chat.setActiveChat(profileId,connectionId),
            redisManager.chat.resetUnread(profileId,connectionId)
          ])
          if (lastMessageId) {
            await redisManager.chat.bufferReadReceipt(connectionId, profileId, lastMessageId, traceId);
          }
          await redisManager.chat.publish(
            'chat_router',
            JSON.stringify({
              receiverId,
              eventType:EventType.MESSAGE_READ,
              eventData: { connectionId },
              traceId
            })
          )
          break;
        }
        case EventType.LEAVE_CHAT: {
          await redisManager.chat.removeActiveChat(profileId);
          break;
        }
        default:
          break;
      }
    } catch (err: any) {
      logger.error({ err, profileId, traceId }, "Error processing message");
    }
  });
  authWs.on('close', async () => {
    try {
      const userTabs = localSockets.get(profileId);
      if (userTabs) {
        userTabs.delete(authWs);
        if (userTabs.size === 0) localSockets.delete(profileId);
      }
      const activeChat = await redisManager.chat.getActiveChat(profileId);
      if (activeChat) {
        await redisManager.chat.removeActiveChat(profileId);
      }
      const count = await redisManager.userConnection.removeSocket(socketId);
      if (count === 0) {
        const profile = await redisManager.userDetail.getProfileFields(profileId, ["queueStatus"]);
        if (profile.queueStatus === UserState.MATCHED) {
          const activeConnection = await prisma.connection.findFirst({
            where: {
              status: ConnectionStatus.MATCHED,
              OR: [{ user1Id: profileId }, { user2Id: profileId }]
            },
            select: { id: true, user1Id: true, user2Id: true }
          });
          if (activeConnection) {
            const partnerId = activeConnection.user1Id === profileId ? activeConnection.user2Id : activeConnection.user1Id;
            const traceId = createId();
            logger.info({ traceId, profileId, connectionId: activeConnection.id }, "User disconnected during match grace period");
            await redisManager.chat.publish(
              'chat_router',
              JSON.stringify({
                receiverId: partnerId,
                eventType: EventType.SYSTEM_EVENT,
                eventData: { 
                  event: SystemAction.PARTNER_OFFLINE, 
                  connectionId: activeConnection.id 
                },
                traceId
              })
            );
            await TaskProducer.dispatchHandleDroppedMatch({
              userId: profileId,
              connectionId: activeConnection.id,
              partnerId,
              traceId
            });
          }
        } else {
          await redisManager.match.leaveQueue(profileId, UserState.IDLE);
        }
      }
    } catch (err: any) {
      logger.error({ err, profileId }, "Error cleaning up socket");
    }
  });
});

let httpServer: Server;
async function bootstrap(){
  await redisManager.chat.subscribe('chat_router');
  redisManager.chat.onMessage((channel, payload) => {
    if (channel === 'chat_router') {
      try {
        const { receiverId, eventData, eventType, traceId } = JSON.parse(payload);
        const receiverSockets = localSockets.get(receiverId);
        if (receiverSockets) {
          if (eventType === EventType.FORCE_DISCONNECT){
            receiverSockets.forEach(ws => {
              const authWs = ws as AuthenticatedWebSocket;
              if (eventData.exceptSessionId && authWs.sessionId === eventData.exceptSessionId) {
                return;
              }
              if (eventData.killAll || authWs.sessionId === eventData.sessionId) {
                authWs.close(4001, eventData.reason || "Session Revoked");
              }
            });
            return;
          }
          const outGoingPayload = JSON.stringify({
            type: eventType,
            payload: eventData,
            traceId
          });
          logger.info({ receiverId, traceId, type: eventType }, "Routing message to client");
          receiverSockets.forEach(authWs => authWs.send(outGoingPayload));
        }
      } catch (err: any) {
        logger.error({ err }, "Failed to parse Redis router message");
      }
    }
  });
  httpServer = server.listen({
  port: PORT,
  host: '0.0.0.0',
  backlog: 8192
},()=>{
    logger.info(`WebSocket running on port ${PORT}`);
  })
}

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const authWs = ws as AuthenticatedWebSocket;
    if ((authWs).isAlive === false) {
      return authWs.terminate(); 
    }
    (authWs).isAlive = false;
    authWs.ping();
  });
}, 30000);
wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

bootstrap();

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`Received ${signal}, shutting down WebSocket server gracefully...`);
  setTimeout(() => {
    logger.error("Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 10000);
  clearInterval(heartbeatInterval);
  logger.info(`Disconnecting ${wss.clients.size} active WebSocket clients...`);
  wss.clients.forEach((authWs) => {
    authWs.close(1001, 'Server shutting down or restarting'); 
  });
  wss.close(async () => {
    logger.info("WebSocket server closed.");
    if (httpServer) {
      httpServer.close(async () => {
        logger.info("Underlying HTTP server closed. Disconnecting Redis...");
        try {
          await redisManager.quit();
          logger.info("WebSocket graceful shutdown complete.");
          process.exit(0);
        } catch (err) {
          logger.error({ err }, "Error during Redis disconnection");
          process.exit(1);
        }
      });
    } else {
      process.exit(0);
    }
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));