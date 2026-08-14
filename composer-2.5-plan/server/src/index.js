import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ensureUploadDir } from './services/storage.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import documentRoutes from './routes/documents.js';
import commentRoutes from './routes/comments.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.clientOrigin,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/documents/:id/comments', commentRoutes);

app.use(errorHandler);

await ensureUploadDir();

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
