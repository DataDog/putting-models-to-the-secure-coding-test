// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { ZodError } from 'zod';
import { HttpError } from '../lib/http.js';

export function notFoundHandler(req, _res, next) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed.',
      details: error.flatten()
    });
    return;
  }

  if (error instanceof HttpError || error.status) {
    res.status(error.status).json({
      error: error.message,
      details: error.details
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: 'Internal server error.'
  });
}
