import express from 'express';
import cors from 'cors';
import { sourcesRouter } from './routes/sources.js';
import { catalogRouter } from './routes/catalog.js';
import { playbackRouter } from './routes/playback.js';

export const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Range', 'Authorization']
}));
app.use(express.json());

// Routes - support both /api/... and /... for local and Vercel serverless compatibility
app.use(['/api/sources', '/sources'], sourcesRouter);
app.use(['/api/catalog', '/catalog'], catalogRouter);
app.use(['/api/playback', '/playback'], playbackRouter);

// Health endpoint
app.get(['/api/health', '/health'], (_req, res) => {
  res.json({
    status: 'ok',
    name: 'BDStream Media Gateway',
    timestamp: new Date().toISOString()
  });
});

// Safety handlers to prevent server crashes on stream aborts or client disconnects
process.on('uncaughtException', (err) => {
  console.warn('[BDStream Server] Uncaught exception handled:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.warn('[BDStream Server] Unhandled rejection handled:', reason);
});
