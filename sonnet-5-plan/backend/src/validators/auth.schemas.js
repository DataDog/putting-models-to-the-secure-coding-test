import { z } from 'zod';

const passwordSchema = z.string().min(10).max(128);

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    name: z.string().min(1).max(100),
    password: passwordSchema,
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    password: z.string().min(1).max(128),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    password: passwordSchema,
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});
