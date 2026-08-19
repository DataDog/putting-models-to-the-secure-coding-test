// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { z } from 'zod';

export const listDocumentsSchema = z.object({
  body: z.any().optional(),
  query: z.object({
    q: z.string().max(255).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
  params: z.any().optional(),
});

export const uploadDocumentSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

export const documentIdParamSchema = z.object({
  body: z.any().optional(),
  query: z.any().optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const updateDocumentSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
  }),
  query: z.any().optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const documentIdInParamsSchema = z.object({
  body: z.any().optional(),
  query: z.any().optional(),
  params: z.object({ documentId: z.string().uuid() }),
});

export const commentBodySchema = z.object({
  body: z.object({
    body: z.string().min(1).max(2000),
  }),
  query: z.any().optional(),
  params: z.object({ documentId: z.string().uuid() }),
});

export const commentIdParamSchema = z.object({
  body: z.any().optional(),
  query: z.any().optional(),
  params: z.object({ documentId: z.string().uuid(), commentId: z.string().uuid() }),
});
