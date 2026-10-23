import { Router, Request, Response } from 'express';
import { registry } from '../connectors/registry.js';
import { validateMediaUrl } from '../security/ssrfGuard.js';
import { Readable } from 'stream';

export const playbackRouter = Router();

// GET /api/playback/resolve/:id - Resolve playable descriptor
playbackRouter.get('/resolve/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const versionId = req.query.versionId as string | undefined;
    const descriptor = await registry.resolvePlayback(id, versionId);
    res.json({
      success: true,
      playback: descriptor
    });
  } catch (err: unknown) {
    res.status(404).json({
      success: false,
      error: (err as Error).message
    });
  }
});

// GET /api/playback/stream - Authorized streaming relay with Range header forwarding
playbackRouter.get('/stream', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    res.status(400).send('Missing url parameter');
    return;
  }

  try {
    // 1. Strict SSRF check: ensures targetUrl is only from allowlisted ISP storage nodes
    validateMediaUrl(targetUrl);

    // 2. Prepare headers with Range forwarding
    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'BDStream-Media-Relay/1.0',
      'Accept': '*/*'
    };

    const clientRange = req.headers.range;
    if (clientRange) {
      upstreamHeaders['Range'] = clientRange;
    }

    const controller = new AbortController();
    req.on('close', () => {
      controller.abort();
    });

    const upstreamRes = await fetch(targetUrl, {
      headers: upstreamHeaders,
      signal: controller.signal
    });

    // 3. Set downstream response headers
    res.status(upstreamRes.status);

    const headersToForward = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'etag',
      'last-modified'
    ];

    for (const h of headersToForward) {
      const val = upstreamRes.headers.get(h);
      if (val) {
        res.setHeader(h, val);
      }
    }

    // Always ensure Accept-Ranges is set
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    if (!upstreamRes.body) {
      res.end();
      return;
    }

    // 4. Pipe stream directly to client
    const nodeStream = Readable.fromWeb(upstreamRes.body as import('stream/web').ReadableStream);
    nodeStream.pipe(res);
  } catch (err: unknown) {
    if ((err as Error).name === 'AbortError') return;
    const status = (err as { statusCode?: number }).statusCode || 500;
    res.status(status).json({
      error: (err as Error).message
    });
  }
});

// GET /api/playback/proxy-asset - Authorized poster and subtitle proxy
playbackRouter.get('/proxy-asset', async (req: Request, res: Response) => {
  const assetUrl = req.query.url as string;
  if (!assetUrl) {
    res.status(400).send('Missing asset url');
    return;
  }

  try {
    validateMediaUrl(assetUrl);
    const controller = new AbortController();
    req.on('close', () => controller.abort());

    const upstreamRes = await fetch(assetUrl, {
      signal: controller.signal,
      headers: { 'Accept': '*/*' }
    });

    if (!upstreamRes.ok) {
      res.status(upstreamRes.status).send('Asset not available');
      return;
    }

    const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (upstreamRes.body) {
      const nodeStream = Readable.fromWeb(upstreamRes.body as import('stream/web').ReadableStream);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message });
  }
});
