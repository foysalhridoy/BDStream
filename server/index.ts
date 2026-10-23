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

// Start server
const server = app.listen(config.PORT, () => {
  console.log(`[BDStream Server] Running on http://localhost:${config.PORT}`);
  console.log(`[BDStream Server] Initializing background source catalog scan...`);
  // Trigger initial scan asynchronously so server starts immediately
  registry.getDhakaFlix().refreshCatalog().catch(err => {
    console.warn('[BDStream Server] Initial DhakaFlix catalog crawl warning:', err.message);
  });
});

export { app, server };
