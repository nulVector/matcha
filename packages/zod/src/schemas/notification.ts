import {z} from "zod";
export const CategorySchema = z.object({
    category:z.enum(["new_friend_request"])
})