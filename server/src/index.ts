import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRouter from '../routes/auth.js';
import chatRouter from '../routes/chat.js';
import moodRouter from '../routes/mood.js';
import userRouter from '../routes/user.js';

// ─────────────────────────────────────────────────────────────────────────────
// APP SETUP
// ─────────────────────────────────────────────────────────────────────────────

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? (process.env.ALLOWED_ORIGIN ?? 'http://localhost:3000')
      : '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/mood', moodRouter);
app.use('/api/user', userRouter);

// ── Health check ──────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV ?? 'development',
  });
});

// ── 404 handler ───────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('[server] Unhandled error:', err.message);
    res.status(500).json({
      error:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err.message,
    });
  }
);

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[server] Moody backend running on port ${PORT}`);
  console.log(`[server] Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

export default app;
