// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { issueCsrfCookie, requireCsrf } from './middleware/csrf.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { documentsRouter } from './routes/documents.routes.js';
import { commentsRouter } from './routes/comments.routes.js';
import { profileRouter } from './routes/profile.routes.js';
import { usersRouter } from './routes/users.routes.js';

export const app = express();

// Needed so express-rate-limit and req.ip see the real client IP when
// deployed behind a single trusted reverse proxy (adjust the number of
// hops if there are more proxies in front of the app).
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser(config.cookieSecret));
app.use(issueCsrfCookie);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Frontend fetches GET /api/health (or any GET) on load to seed the CSRF
// cookie before making its first state-changing request (login/register).
app.use('/api/auth', requireCsrf, authRouter);
app.use('/api/documents', requireCsrf, documentsRouter);
app.use('/api/comments', requireCsrf, commentsRouter);
app.use('/api/profile', requireCsrf, profileRouter);
app.use('/api/users', requireCsrf, usersRouter);

app.use('/api', notFoundHandler);
app.use(errorHandler);
