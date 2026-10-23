import { Router, Request, Response } from 'express';
import { registry } from '../connectors/registry.js';
import { CatalogQueryOptions, MediaType, SourceId } from '../connectors/types.js';

export const catalogRouter = Router();

// GET /api/catalog - Query catalog with search, filters, pagination
catalogRouter.get('/', async (req: Request, res: Response) => {
  try {
    const options: CatalogQueryOptions = {
      source: (req.query.source as SourceId | 'all') || 'all',
      type: (req.query.type as MediaType | 'all') || 'all',
      category: req.query.category as string | undefined,
      search: req.query.search as string | undefined,
      year: req.query.year ? parseInt(req.query.year as string, 10) : undefined,
      sortBy: (req.query.sortBy as 'discoveredAt' | 'title' | 'year') || 'discoveredAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 24
    };

    const result = await registry.getCatalog(options);
    res.json({
      success: true,
      ...result
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      error: (err as Error).message
    });
  }
});

// GET /api/catalog/:id - Item details (versions, poster, subtitles)
catalogRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const details = await registry.getItemDetails(id);
    res.json({
      success: true,
      item: details
    });
  } catch (err: unknown) {
    res.status(404).json({
      success: false,
      error: (err as Error).message
    });
  }
});

// POST /api/catalog/refresh - Force refresh
catalogRouter.post('/refresh', async (_req: Request, res: Response) => {
  try {
    await registry.getDhakaFlix().refreshCatalog();
    res.json({ success: true, message: 'Catalog refresh completed.' });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});
