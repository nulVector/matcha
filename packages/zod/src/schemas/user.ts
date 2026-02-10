import { z } from "zod";
const username = z
  .string()
  .trim()
  .min(5, "Username must be at least 5 characters")
  .max(30, "Username is too long")
  .toLowerCase()
  .regex(/^[a-z0-9_]+$/,"Username can only contain lowercase letters, numbers, and underscores")

const cuidId = z.cuid2({ message: "Invalid ID format" });

export const usernameCheckSchema = z.object({
  username:username
})
export type usernameCheckType = z.infer<typeof usernameCheckSchema>;

export const initiateProfileSchema = z.object({
  username:username,
  avatarId:cuidId
})
export type initiateProfileType = z.infer<typeof initiateProfileSchema>;

const aboutMeSchema = z
  .string()
  .trim()
  .max(100,"Text is too long.")
  .optional()

const openingQuesSchema = z
  .string()
  .trim()
  .max(100,"Text is too long.")
  .optional()

const interestsIdSchema = z
  .array(cuidId)
  .min(3,"Select minimum 3 interests.")
  .max(10,"Upto only 10 can be selected.")
  .optional()
  
export const updateProfileSchema = z.object({
  aboutMe: aboutMeSchema,
  openingQues: openingQuesSchema,
  locationId: cuidId.optional(),
  interestsId: interestsIdSchema
})
export type updateProfileType = z.infer<typeof updateProfileSchema>

export const updateAvatarSchema = z.object({
  avatarId: cuidId
})
export type updateAvatarType = z.infer<typeof updateAvatarSchema>

export const updateDiscoverySchema = z.object({
  allowDiscovery: z.boolean()
})
export type updateDiscoveryType = z.infer<typeof updateDiscoverySchema>

export const getConnectionsListSchema = z.object({
  status: z.enum(["FRIEND" , "ARCHIVED"],{
    error:"Must be either 'FRIEND' or 'ARCHIVED'"
  })
})
export type getConnectionsListType = z.infer<typeof getConnectionsListSchema>

export const getFriendRequestsSchema = z.object({
  type: z.enum(["incoming","outgoing"],{
    error:"Must be either 'incoming' or 'outgoing'"
  })
})
export type getFriendRequestsType = z.infer<typeof getFriendRequestsSchema>

export const getUserProfileSchema = z.object({
  type: z.enum(["incoming","outgoing"],{
    error:"Must be either 'incoming' or 'outgoing'"
  })
})
export type getUserProfileType = z.infer<typeof getUserProfileSchema>

export const userIdSchema = z.object({
  userId:cuidId
})
export type userIdType = z.infer<typeof userIdSchema>

export const requestIdSchema = z.object({
  requestId:cuidId
})
export type requestIdType = z.infer<typeof requestIdSchema>

export const connectionIdSchema = z.object({
  connectionId:cuidId
})
export type connectionIdType = z.infer<typeof connectionIdSchema>

export const sendRequestSchema = z.object({
  origin:z.enum(["SEARCH","ARCHIVE"], {
    error:"Must be either 'SEARCH' or 'ARCHIVE'"
  }),
  matchId: cuidId.optional().nullable()
}).refine((data)=>{
  if (data.origin === 'ARCHIVE' && !data.matchId){
    return false;
  }
  return true;
},{
  message: "matchId is required when origin is ARCHIVE",
  path: ["matchId"],
})
export type sendRequestType = z.infer<typeof sendRequestSchema>

export const requestHandleSchema = z.object({
  action: z.enum(["ACCEPT","REJECT"],{
    error:"Must be either 'ACCEPT' or 'REJECT'"
  })
})
export type requestHandleType = z.infer<typeof requestHandleSchema>
