import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(8).max(128);
export const nameSchema = z.string().trim().min(1).max(120);
export const uuidSchema = z.string().uuid();
export const roleSchema = z.enum(['admin', 'manager', 'member']);
export const statusSchema = z.enum(['active', 'disabled']);

export const registerSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  password: passwordSchema
}).strict();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128)
}).strict();

export const forgotPasswordSchema = z.object({
  email: emailSchema
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  password: passwordSchema
}).strict();

export const profileSchema = z.object({
  email: emailSchema.optional(),
  name: nameSchema.optional(),
  currentPassword: z.string().min(1).max(128).optional()
}).strict().refine((data) => data.email || data.name, {
  message: 'At least one profile field is required'
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema
}).strict();

export const uploadMetadataSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional().default('')
}).strict();

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(2000)
}).strict();

export const adminCreateUserSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  role: roleSchema.default('member'),
  password: passwordSchema
}).strict();

export const adminUpdateUserSchema = z.object({
  name: nameSchema.optional(),
  role: roleSchema.optional(),
  status: statusSchema.optional()
}).strict().refine((data) => data.name || data.role || data.status, {
  message: 'At least one user field is required'
});

