import { EventType } from "@matcha/shared";
import { z } from "zod";

const cuidId = z.cuid2({ message: "Invalid ID format" });

const baseSocketMessage = z.object({
  traceId: z.string().optional()
});

export const socketMessageSchema = z.discriminatedUnion("type", [
  baseSocketMessage.extend({
    type: z.literal(EventType.SEND_MESSAGE),
    payload: z.object({
      connectionId: cuidId,
      receiverId: cuidId,
      content: z.string().trim().min(1, "Message cannot be empty").max(2000, "Message too long"),
    })
  }),
  baseSocketMessage.extend({
    type: z.literal(EventType.START_TYPING),
    payload: z.object({
      connectionId: cuidId,
      receiverId: cuidId,
    })
  }),
  baseSocketMessage.extend({
    type: z.literal(EventType.STOP_TYPING),
    payload: z.object({
      connectionId: cuidId,
      receiverId: cuidId,
    })
  }),
  baseSocketMessage.extend({
    type: z.literal(EventType.VIEW_CHAT),
    payload: z.object({
      connectionId: cuidId,
      receiverId: cuidId,
      lastMessageId: cuidId.optional(),
    })
  }),
  baseSocketMessage.extend({
    type: z.literal(EventType.LEAVE_CHAT),
    payload: z.object({
      connectionId: cuidId,
    })
  })
]);

export type SocketMessage = z.infer<typeof socketMessageSchema>;