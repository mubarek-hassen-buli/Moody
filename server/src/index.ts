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

const server = app.listen(PORT, () => {
  console.log(`[server] Moody backend running on port ${PORT}`);
  console.log(`[server] Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

// Surface port-in-use and other socket-level errors rather than
// exiting silently with no output.
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] Port ${PORT} is already in use. Kill the other process first.`);
  } else {
    console.error('[server] Server error:', err.message);
  }
  process.exit(1);
});

// Catch any unhandled promise rejections (e.g. from async module init)
// so they are logged rather than silently killing the process.
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err.message);
  process.exit(1);
});

export default app;
