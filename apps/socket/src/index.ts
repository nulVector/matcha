import { CachedMessage, MessageType, UserStatus } from '@matcha/redis';
import crypto from 'crypto';
import { createServer, IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { WebSocket, WebSocketServer } from 'ws';
import { redisManager } from './services/redis';
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
  const userId = userSession.userId;
  const socketId = crypto.randomUUID(); 
  try {
    await redisManager.userConnection.mapSocket(userId,socketId);
    if (!localSockets.has(userId)) localSockets.set(userId, new Set());
    localSockets.get(userId)!.add(ws);
    ws.on('message', async (rawMessage: Buffer) => {
      let parsedData;
      try {
        parsedData = JSON.parse(rawMessage.toString());
      } catch (err) {
        console.error(`Malformed JSON from ${userId}`);
        return;
      }
      try {
        switch (parsedData.type) {
          case 'CHAT_MESSAGE': {
            const { connectionId, receiverId, content } = parsedData.payload;
            const message: CachedMessage = {
              id: crypto.randomUUID(),
              content,
              senderId: userId,
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
            await redisManager.chat.setTyping(connectionId,userId);
            await redisManager.chat.publish(
              'chat_router',
              JSON.stringify({
                receiverId,
                eventData:{
                  senderId:userId,
                  connectionId
                },
                eventType:EventType.USER_TYPING
              })
            )
            break;
          }
          case 'MARK_READ': {
            const { connectionId, receiverId} = parsedData.payload;
            await redisManager.chat.resetUnread(userId,connectionId);
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
          default:
            break;
        }
      } catch (err) {
        console.error(`Error processing message from ${userId}:`);
      }
    });

    ws.on('close', async () => {
      try {
        const userTabs = localSockets.get(userId);
        if (userTabs) {
          userTabs.delete(ws);
          if (userTabs.size === 0) localSockets.delete(userId);
        }
        const count = await redisManager.userConnection.removeSocket(socketId);
        if (count === 0) {
          await redisManager.match.leaveQueue(userId, UserStatus.OFFLINE);
        }
      } catch (err) {
        console.error(`Error cleaning up socket for ${userId}:`, err);
      }
    });
  } catch (err) {
    console.error(`Failed to initialize connection for ${userSession.userId}:`, err);
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
bootstrap();