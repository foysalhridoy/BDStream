import { Router, Request, Response } from 'express';
import { registry } from '../connectors/registry.js';
import { z } from 'zod';

export const sourcesRouter = Router();

// GET /api/sources - Health & Diagnostics for all sources
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

const sessionSchema = z.object({
  sessionToken: z.string().trim().min(1)
});

// POST /api/sources/icc/session - Configure subscriber session token
sourcesRouter.post('/icc/session', async (req: Request, res: Response) => {
  try {
    const { sessionToken } = sessionSchema.parse(req.body);
    registry.getICC().setSessionToken(sessionToken);
    const health = await registry.getICC().checkAvailability();
    res.json({
      success: true,
      message: health.sessionValid
        ? 'Session token accepted and validated.'
        : 'Session token set, but verification failed.',
      health
    });
  } catch (err: unknown) {
    res.status(400).json({
      success: false,
      error: (err as Error).message
    });
  }
});
