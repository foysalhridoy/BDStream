import { describe, it, expect } from 'vitest';
import { validateMediaUrl, SecurityError } from '../server/security/ssrfGuard.js';

describe('SSRF Guard & URL Allowlist Protection', () => {
  it('permits authorized DhakaFlix storage host (172.16.50.7)', () => {
    const validUrl = 'http://172.16.50.7/DHAKA-FLIX-7/English%20Movies/sample.mp4';
    const parsed = validateMediaUrl(validUrl);
    expect(parsed.hostname).toBe('172.16.50.7');
  });

  it('permits authorized ICC media host (10.16.100.244)', () => {
    const validUrl = 'http://10.16.100.244/media/stream.mp4';
    const parsed = validateMediaUrl(validUrl);
    expect(parsed.hostname).toBe('10.16.100.244');
  });

  it('blocks localhost and loopback addresses (127.0.0.1)', () => {
    expect(() => validateMediaUrl('http://127.0.0.1/admin')).toThrow(SecurityError);
    expect(() => validateMediaUrl('http://localhost:8080/')).toThrow(SecurityError);
  });

  it('blocks AWS/GCP cloud metadata endpoints (169.254.169.254)', () => {
    expect(() => validateMediaUrl('http://169.254.169.254/latest/meta-data/')).toThrow(SecurityError);
  });

  it('blocks arbitrary external WAN hosts', () => {
    expect(() => validateMediaUrl('http://example.com/movie.mp4')).toThrow(SecurityError);
    expect(() => validateMediaUrl('http://8.8.8.8/')).toThrow(SecurityError);
  });

  it('blocks non-HTTP protocols (file://, ftp://, gopher://)', () => {
    expect(() => validateMediaUrl('file:///etc/passwd')).toThrow(SecurityError);
    expect(() => validateMediaUrl('ftp://172.16.50.7/file.mp4')).toThrow(SecurityError);
  });

  it('blocks non-standard ports (e.g. 22, 3306, 6379)', () => {
    expect(() => validateMediaUrl('http://172.16.50.7:6379/')).toThrow(SecurityError);
  });
});
