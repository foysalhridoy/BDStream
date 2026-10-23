import { Router, Request, Response } from 'express';
import { registry } from '../connectors/registry.js';

export const sourcesRouter = Router();

// GET /api/sources - Health of DhakaFlix
sourcesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const health = await registry.getSourcesHealth();
    res.json({
      success: true,
      sources: health
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      error: (err as Error).message
    });
  }
});
