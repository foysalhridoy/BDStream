/**
 * Converts SubRip (.srt) subtitle format into WebVTT (.vtt) format with optional delay sync
 */
export function srtToVtt(srtContent: string, delayMs: number = 0): string {
  if (!srtContent) return 'WEBVTT\n\n';

  // Normalize line endings
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Replace SRT timestamp comma with WebVTT dot: 00:01:20,000 --> 00:01:20.000
  let vtt = 'WEBVTT\n\n';

  // Regex to match timestamp lines: 00:00:20,000 --> 00:00:24,400
  const timeRegex = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;

  const lines = normalized.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = timeRegex.exec(line);

    if (match) {
      if (delayMs === 0) {
        vtt += line.replace(/,/g, '.') + '\n';
      } else {
        const startSec = timeToSeconds(match[1], match[2], match[3], match[4]) + delayMs / 1000;
        const endSec = timeToSeconds(match[5], match[6], match[7], match[8]) + delayMs / 1000;
        vtt += `${secondsToVttTime(Math.max(0, startSec))} --> ${secondsToVttTime(Math.max(0, endSec))}\n`;
      }
    } else {
      vtt += line + '\n';
    }
  }

  return vtt;
}

function timeToSeconds(h: string, m: string, s: string, ms: string): number {
  return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10) + parseInt(ms, 10) / 1000;
}

function secondsToVttTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  const ms = Math.floor((totalSeconds % 1) * 1000);

  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}
