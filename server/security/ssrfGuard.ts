import { ALLOWED_SOURCE_HOSTS } from '../config.js';

export class SecurityError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Validates a target URL against the strict SSRF allowlist.
 * Only explicit ISP media server hosts are allowed.
 */
export function validateMediaUrl(targetUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new SecurityError('Invalid URL format', 400);
  }

  // Only http and https protocols permitted
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SecurityError(`Forbidden protocol: ${parsed.protocol}`);
  }

  // Hostname must be in the explicit allowlist
  const hostname = parsed.hostname.toLowerCase();
  if (!ALLOWED_SOURCE_HOSTS.has(hostname)) {
    throw new SecurityError(
      `Access Denied: Host "${hostname}" is not in the authorized ISP source allowlist.`
    );
  }

  // Port check: default HTTP/HTTPS or 80/443/8080/8081 only
  const port = parsed.port;
  if (port && port !== '80' && port !== '443' && port !== '8080' && port !== '8081') {
    throw new SecurityError(`Forbidden port: ${port}`);
  }

  return parsed;
}
