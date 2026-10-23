import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { sourcesRouter } from './routes/sources.js';
import { catalogRouter } from './routes/catalog.js';
import { playbackRouter } from './routes/playback.js';
import { registry } from './connectors/registry.js';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Range', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api/sources', sourcesRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/playback', playbackRouter);

// Health endpoint
app.get('/api/health', (_req, res) => {
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

// Start server
const server = app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`[BDStream Server] Running on http://127.0.0.1:${config.PORT}`);
  console.log(`[BDStream Server] Initializing background source catalog scan...`);
  // Trigger initial scan asynchronously so server starts immediately
  registry.getDhakaFlix().refreshCatalog().catch(err => {
    console.warn('[BDStream Server] Initial DhakaFlix catalog crawl warning:', err.message);
  });
});

export { app, server };
