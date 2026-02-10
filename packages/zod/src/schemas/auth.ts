import {z} from "zod";

const emailSchema = z.email()
  .min(1)
  .max(200,"Email is too long")
  .trim()
const passwordSchema = z.string()
  .min(8,"Password must be at least 8 characters")
  .max(20,"Password is too long")
  .trim()
  .regex(
    /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/,
    "Password must contain at least one number, one uppercase, and one lowercase letter",
  )

export const requestPasswordResetSchema = z
  .object({
    email:emailSchema
  })
export type requestPasswordResetType = z.infer<typeof requestPasswordResetSchema>;

export const resetPasswordSchema = z
  .object({
    token:z.string(),
    password:passwordSchema,
    confirmPassword: z.string().trim()
  })
  .refine((data)=> data.password===data.confirmPassword,{
    error:"Confirm password must match password",
    path:["confirmPassword"]
  })
export type resetPasswordType = z.infer<typeof resetPasswordSchema>;

export const signupSchema = z
  .object({
    email:emailSchema,
    password:passwordSchema,
    confirmPassword:z.string().trim()
  })
  .refine((data)=> data.password === data.confirmPassword,{
    error:"Passwords do not match",
    path:["confirmPassword"]
  })
export type signupType = z.infer<typeof signupSchema>;

export const loginSchema = z
  .object({
    email: emailSchema,
    password:z.string().min(1, "Password is required").trim()
  })
export type loginType = z.infer<typeof loginSchema>;

export const updatePasswordSchema = z
  .object({
    currentPassword:z.string().trim(),
    newPassword:passwordSchema
  })
  .refine((data)=>data.currentPassword !== data.newPassword,{
    error:"New password must be different from current password",
    path:["newPassword"]
  })
export type updatePasswordType = z.infer<typeof updatePasswordSchema>;

export const deactivatePasswordSchema = z.object({
  password:passwordSchema
})
export type deactivatePasswordType = z.infer<typeof deactivatePasswordSchema>;