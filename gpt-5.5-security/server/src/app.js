import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { authRouter } from './routes/auth.js';
import { profileRouter } from './routes/profile.js';
import { documentsRouter } from './routes/documents.js';
import { commentsRouter } from './routes/comments.js';
import { adminRouter } from './routes/admin.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(pinoHttp({ logger }));

app.use(helmet({
  contentSecurityPolicy: config.isProduction ? undefined : false,
  crossOriginEmbedderPolicy: false,
  hsts: config.isProduction
    ? {
      maxAge: 31536000,
      includeSubDomains: true
    }
    : false
}));

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || config.allowedOrigins.has(origin)) {
      callback(null, origin || false);
      return;
    }
    callback(new Error('Origin is not allowed'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '128kb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '128kb' }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api', apiLimiter);
app.use('/api/profile', profileRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/documents/:documentId/comments', commentsRouter);
app.use('/api/admin', adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };

