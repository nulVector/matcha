import { EventType } from "@matcha/shared";
import { z } from "zod";

const cuidId = z.cuid2({ message: "Invalid ID format" });

export const socketMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(EventType.SEND_MESSAGE),
    payload: z.object({
      connectionId: cuidId,
      receiverId: cuidId,
      content: z.string().trim().min(1, "Message cannot be empty").max(2000, "Message too long"),
    })
  }),
  z.object({
    type: z.literal(EventType.START_TYPING),
    payload: z.object({
      connectionId: cuidId,
      receiverId: cuidId,
    })
  }),
  z.object({
    type: z.literal(EventType.STOP_TYPING),
    payload: z.object({
      connectionId: cuidId,
      receiverId: cuidId,
    })
  }),
  z.object({
    type: z.literal(EventType.VIEW_CHAT),
    payload: z.object({
      connectionId: cuidId,
      receiverId: cuidId,
      lastMessageId: cuidId.optional(),
    })
  }),
  z.object({
    type: z.literal(EventType.LEAVE_CHAT),
    payload: z.object({
      connectionId: cuidId,
    })
  })
]);

export type SocketMessage = z.infer<typeof socketMessageSchema>;