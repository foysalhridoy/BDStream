import { app } from './app.js';
import { config } from './config.js';
import { registry } from './connectors/registry.js';

// Start server
const server = app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`[BDStream Server] Running on http://127.0.0.1:${config.PORT}`);
  console.log(`[BDStream Server] Initializing background source catalog scan...`);
  // Trigger initial scan asynchronously so server starts immediately
  registry.getDhakaFlix().refreshCatalog().catch(err => {
    console.warn('[BDStream Server] DhakaFlix crawl warning:', err.message);
  });
  registry.getCinePlex().refreshCatalog().catch(err => {
    console.warn('[BDStream Server] CinePlex crawl warning:', err.message);
  });
  registry.getBasPlay().refreshCatalog().catch(err => {
    console.warn('[BDStream Server] BAS Play crawl warning:', err.message);
  });
});

export { app, server };
