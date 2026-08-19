// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { z } from 'zod';

const password = z
  .string()
  .min(10, 'Password must be at least 10 characters.')
  .max(200, 'Password is too long.');

const email = z
  .string()
  .email('Email must be valid.')
  .max(320)
  .transform((value) => value.trim().toLowerCase());

export const registerSchema = z.object({
  email,
  password,
  name: z.string().trim().min(1).max(120)
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200)
});

export const forgotPasswordSchema = z.object({
  email
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(300),
  password
});

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  bio: z.string().trim().max(1000).optional().default(''),
  currentPassword: z.string().max(200).optional().or(z.literal('')),
  newPassword: password.optional().or(z.literal(''))
});

export const userPatchSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  isActive: z.boolean().optional()
});

export const documentBodySchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).optional().default('')
});

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(2000)
});

export const searchSchema = z.object({
  q: z.string().trim().max(200).optional().default('')
});
