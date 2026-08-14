import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().max(255).optional(),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(10).max(128),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

export const updateRoleSchema = z.object({
  body: z.object({
    role: z.enum(['ADMIN', 'USER']),
  }),
  query: z.any().optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const updateDisableSchema = z.object({
  body: z.object({
    isDisabled: z.boolean(),
  }),
  query: z.any().optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const userIdParamSchema = z.object({
  body: z.any().optional(),
  query: z.any().optional(),
  params: z.object({ id: z.string().uuid() }),
});
