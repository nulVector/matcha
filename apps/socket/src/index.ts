import { CachedMessage, MessageType, UserState } from '@matcha/redis';
import { createServer, IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { WebSocket, WebSocketServer } from 'ws';
import { redisManager } from './services/redis';
import { createId } from '@paralleldrive/cuid2';
interface JwtPayload {
  id:string,
  tokenVersion:number
}
interface UserSession {
  userId:string,
  tokenVersion: number,
  userProfileId:string | null
}
enum EventType {
  CHAT_MESSAGE = "Chat_Message",
  USER_TYPING = "User_Typing",
  STOPPED_TYPING = "Stopped_Typing",
  MESSAGE_READ = "Message_Read"
}
const server = createServer((req, res) => {
  res.writeHead(200);
  res.end("WebSocket Server Running");
});
const wss = new WebSocketServer({noServer:true});
const jwtSecret = process.env.JWT_SECRET;
const PORT = process.env.WS_PORT || 8080;
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
    const token = cookies.token;
    if(!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    const jwt_payload = jwt.verify(token,jwtSecret) as JwtPayload;
    const userSession = await redisManager.auth.getSession(jwt_payload.id);
    if (!userSession || userSession.tokenVersion !== jwt_payload.tokenVersion){
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request,socket,head,(ws)=>{
      wss.emit('connection',ws,request,userSession);
    })
  } catch (err) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
})
wss.on('connection', async (ws:WebSocket, _request:IncomingMessage, userSession:UserSession)=>{
  const profileId = userSession.userProfileId;
  if (!profileId) {
    ws.close(1008, "Profile required to connect");
    return;
  }
  const socketId = createId(); 
  (ws as any).isAlive = true;
  ws.on('pong', async () => {
    (ws as any).isAlive = true;
    try {
      await redisManager.userConnection.setUserStatus(profileId);
    } catch (err) {
      console.error(`Heartbeat update failed for ${profileId}:`, err);
    }
  });
  try {
    await redisManager.userConnection.mapSocket(profileId,socketId);
    if (!localSockets.has(profileId)) localSockets.set(profileId, new Set());
    localSockets.get(profileId)!.add(ws);
    ws.on('message', async (rawMessage: Buffer) => {
      let parsedData;
      try {
        parsedData = JSON.parse(rawMessage.toString());
      } catch (err) {
        console.error(`Malformed JSON from ${profileId}`);
        return;
      }
      try {
        switch (parsedData.type) {
          case 'CHAT_MESSAGE': {
            const { connectionId, receiverId, content } = parsedData.payload;
            const message: CachedMessage = {
              id: createId(),
              content,
              senderId: profileId,
              createdAt: new Date().toISOString(),
              type: MessageType.TEXT
            };
            await redisManager.chat.processNewMessage(
              connectionId, 
              receiverId, 
              message, 
              EventType.CHAT_MESSAGE
            );
            break;
          }
          case 'TYPING_INDICATOR': {
            const { connectionId, receiverId} = parsedData.payload;
            await redisManager.chat.publish(
              'chat_router',
              JSON.stringify({
                receiverId,
                eventData:{
                  senderId:profileId,
                  connectionId
                },
                eventType:EventType.USER_TYPING
              })
            )
            break;
          }
          case 'STOPPED_TYPING': {
            const { connectionId, receiverId } = parsedData.payload;
            await redisManager.chat.publish(
              'chat_router',
              JSON.stringify({
                receiverId,
                eventType: EventType.STOPPED_TYPING,
                eventData: {
                  senderId: profileId,
                  connectionId
                }
              })
            );
            break;
          }
          case 'VIEWING_CHAT': {
            const { connectionId, receiverId} = parsedData.payload;
            await Promise.all([
              redisManager.chat.setActiveChat(profileId,connectionId),
              redisManager.chat.resetUnread(profileId,connectionId)
            ])
            await redisManager.chat.publish(
              'chat_router',
              JSON.stringify({
                receiverId,
                eventType:EventType.MESSAGE_READ,
                eventData: { connectionId }
              })
            )
            break;
          }
          case 'LEAVING_CHAT': {
            const { connectionId } = parsedData.payload;
            await redisManager.chat.removeActiveChat(profileId);
            //TODO - push in queue
            break;
          }
          default:
            break;
        }
      } catch (err) {
        console.error(`Error processing message from ${profileId}:`, err);
      }
    });

    ws.on('close', async () => {
      try {
        const activeChat = await redisManager.chat.getActiveChat(profileId);
        if (activeChat) {
          await redisManager.chat.removeActiveChat(profileId);
          //TODO - add to queue
        }
        const userTabs = localSockets.get(profileId);
        if (userTabs) {
          userTabs.delete(ws);
          if (userTabs.size === 0) localSockets.delete(profileId);
        }
        const count = await redisManager.userConnection.removeSocket(socketId);
        if (count === 0) {
          await redisManager.match.leaveQueue(profileId, UserState.IDLE);
        }
      } catch (err) {
        console.error(`Error cleaning up socket for ${profileId}:`, err);
      }
    });
  } catch (err) {
    console.error(`Failed to initialize connection for ${profileId}:`, err);
    ws.close();
  }
});

async function bootstrap(){
  await redisManager.chat.subscribe('chat_router');
  redisManager.chat.onMessage((channel, payload) => {
    if (channel === 'chat_router') {
      try {
        const { receiverId, eventData, eventType } = JSON.parse(payload);
        const receiverSockets = localSockets.get(receiverId);
        if (receiverSockets) {
          const outGoingPayload = JSON.stringify({
            type: eventType,
            payload: eventData
          });
          receiverSockets.forEach(ws => ws.send(outGoingPayload));
        }
      } catch (err) {
        console.error("Failed to parse Redis router message", err);
      }
    }
  });
  server.listen(PORT,()=>{
    console.log(`Websocket running on port ${PORT}`);
  })
}

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if ((ws as any).isAlive === false) {
      return ws.terminate(); 
    }
    (ws as any).isAlive = false;
    ws.ping();
  });
}, 30000);
wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

bootstrap();