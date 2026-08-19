// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import multer from 'multer';
import { isProduction } from '../config/env.js';

export function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }

  if (err.message === 'Unsupported file type') {
    return res.status(400).json({ error: err.message });
  }

  console.error(err);

  res.status(err.status || 500).json({
    error: isProduction ? 'Internal server error' : err.message,
  });
}
