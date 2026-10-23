import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DHAKAFLIX_BASE_URL: z.string().url().default('http://172.16.50.4/'),
  CATALOG_CACHE_TTL: z.coerce.number().default(900), // 15 mins
  CLIENT_URL: z.string().default('http://localhost:5173'),
});

export const config = envSchema.parse(process.env);

// Strict Allowlist for SSRF Prevention (DhakaFlix storage clusters)
export const ALLOWED_SOURCE_HOSTS = new Set([
  '172.16.50.4',
  '172.16.50.7',
  '172.16.50.8',
  '172.16.50.10',
  '172.16.50.12',
  '172.16.50.14',
]);
