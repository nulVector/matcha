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

export const vibeCheck = z.object({
  vibe:z.enum(['cyber' , 'nature' , 'tiny' , 'legendary' , 'chaos'])
})
export type vibeCheckType = z.infer<typeof vibeCheck>

const avatarUrlSchema = z
  .url("Must be a valid URL")
  .max(500, "URL is too long");

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

const locationNameSchema = z
.string()
.trim()
.min(2, "Location name too short")
.max(100);

const latitudeSchema = z
  .number("Latitude must be a number")
  .min(-90, "Invalid latitude")
  .max(90, "Invalid latitude");

const longitudeSchema = z
  .number("Longitude must be a number")
  .min(-180, "Invalid longitude")
  .max(180, "Invalid longitude");

const interestsSchema = z
  .array(z.string().trim().min(1, "Interest cannot be empty"))
  .min(3, "Select minimum 3 interests.")
  .max(10, "Up to only 10 can be selected.");

export const initiateProfileSchema = z.object({
  username: username,
  avatarUrl: avatarUrlSchema,
  aboutMe: aboutMeSchema.optional(),
  openingQues: openingQuesSchema.optional(),
  location: locationNameSchema,
  locationLatitude: latitudeSchema,
  locationLongitude: longitudeSchema,
  interest: interestsSchema
})
export type initiateProfileType = z.infer<typeof initiateProfileSchema>;

export const updateProfileSchema = z.object({
  avatarUrl:avatarUrlSchema.optional(),
  aboutMe: aboutMeSchema.optional(),
  openingQues: openingQuesSchema.optional(),
  location: locationNameSchema.optional(),
  locationLatitude: latitudeSchema.optional(),
  locationLongitude: longitudeSchema.optional(),
  interest: interestsSchema.optional(),
  allowDiscovery: z.boolean().optional()
})
export type updateProfileType = z.infer<typeof updateProfileSchema>

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
  connectionId: cuidId.optional().nullable()
}).refine((data)=>{
  if (data.origin === 'ARCHIVE' && !data.connectionId){
    return false;
  }
  return true;
},{
  message: "connectionId is required when origin is ARCHIVE",
  path: ["connectionId"],
})
export type sendRequestType = z.infer<typeof sendRequestSchema>

export const requestHandleSchema = z.object({
  action: z.enum(["ACCEPT","REJECT"],{
    error:"Must be either 'ACCEPT' or 'REJECT'"
  })
})
export type requestHandleType = z.infer<typeof requestHandleSchema>
