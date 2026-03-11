import { z } from "zod";

export const getChatHistorySchema = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(50) 
});
export type getChatHistoryType = z.infer<typeof getChatHistorySchema>;