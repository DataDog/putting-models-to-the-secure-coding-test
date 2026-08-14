import { z } from "zod";

const password = z.string().min(8, "Password must be at least 8 characters.");
const fullName = z.string().trim().min(1).max(120);
const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());

export const registerSchema = z.object({
  email,
  fullName,
  password
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1)
});

export const forgotPasswordSchema = z.object({
  email
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password
});

export const profileSchema = z.object({
  email: email.optional(),
  fullName: fullName.optional()
});

export const uploadDocumentSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).optional().default("")
});

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(3000)
});

export const adminUserUpdateSchema = z.object({
  email: email.optional(),
  fullName: fullName.optional(),
  role: z.enum(["admin", "user"]).optional(),
  isDisabled: z.boolean().optional()
});
