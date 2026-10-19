import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { authRouter } from './routes/auth.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { documentsRouter } from './routes/documents.routes.js';
import { commentsRouter } from './routes/comments.routes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(pinoHttp({ logger }));

// Defense-in-depth global rate limit; specific auth endpoints have tighter
// limits applied in their own routers.
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/documents/:documentId/comments', commentsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
