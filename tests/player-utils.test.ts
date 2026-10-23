import { describe, it, expect } from 'vitest';
import { formatTime, clamp } from '../src/services/playerUtils.js';
import { srtToVtt } from '../src/services/subtitleParser.js';

describe('Player Utility Functions', () => {
  it('formats short times under 1 hour in MM:SS', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(599)).toBe('09:59');
  });

  it('formats long times over 1 hour in HH:MM:SS', () => {
    expect(formatTime(3600)).toBe('01:00:00');
    expect(formatTime(7325)).toBe('02:02:05');
  });

  it('handles negative or invalid seconds gracefully', () => {
    expect(formatTime(-10)).toBe('00:00');
    expect(formatTime(NaN)).toBe('00:00');
  });

  it('clamps volume values correctly between 0 and 1', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(1.5, 0, 1)).toBe(1);
    expect(clamp(-0.2, 0, 1)).toBe(0);
  });
});

describe('Subtitle SRT to WebVTT Converter', () => {
  it('converts basic SRT timestamps with commas to VTT dots', () => {
    const srt = `1\n00:00:20,000 --> 00:00:24,400\nHello, world!\n`;
    const vtt = srtToVtt(srt);
    expect(vtt).toContain('WEBVTT');
    expect(vtt).toContain('00:00:20.000 --> 00:00:24.400');
    expect(vtt).toContain('Hello, world!');
  });

  it('applies positive delay offset to subtitle timestamps', () => {
    const srt = `1\n00:00:20,000 --> 00:00:24,000\nDelayed text\n`;
    const vtt = srtToVtt(srt, 2000); // +2s
    expect(vtt).toContain('00:00:22.000 --> 00:00:26.000');
  });
});
