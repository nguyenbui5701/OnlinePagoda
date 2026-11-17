import { z } from 'zod';

export function normalizeUsername(input: string): string | null {
  let value = input.trim();
  if (/^https:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (!['www.tiktok.com', 'tiktok.com'].includes(url.hostname.toLowerCase()) || url.port || url.username || url.password) return null;
      const match = /^\/@([^/]+)(?:\/live)?\/?$/.exec(url.pathname);
      if (!match) return null;
      value = decodeURIComponent(match[1]);
    } catch { return null; }
  } else value = value.replace(/^@/, '');
  return /^[a-zA-Z0-9_][a-zA-Z0-9_.]{0,23}$/.test(value) && !value.endsWith('.') ? value.toLowerCase() : null;
}
export const usernameSchema = z.string().max(250).transform((value, ctx) => {
  const username = normalizeUsername(value);
  if (!username) { ctx.addIssue({ code: 'custom', message: 'Nhập @username hoặc URL https://www.tiktok.com/@username/live hợp lệ.' }); return z.NEVER; }
  return username;
});
export type SourceMode = 'demo' | 'tiktok';
export type LiveStatus = 'DEMO' | 'CONNECTING' | 'LIVE_CONNECTED' | 'LIVE_OFFLINE' | 'RECONNECTING' | 'RATE_LIMITED' | 'ERROR' | 'DISCONNECTED';
export interface LiveConnectionState {
  status: LiveStatus; username: string; roomId: string | null; connectedAt: number | null;
  lastEventAt: number | null; retryAt: number | null; attempt: number;
  lastError: string | null; errorCode: string | null;
  viewers: string | null; viewersAt: number | null;
  received: { chat: number; member: number; gift: number; like: number; roomUser: number };
  fixture: boolean;
}
export function initialLiveState(): LiveConnectionState {
  return { status: 'DISCONNECTED', username: '', roomId: null, connectedAt: null, lastEventAt: null,
    retryAt: null, attempt: 0, lastError: null, errorCode: null, viewers: null, viewersAt: null,
    received: { chat: 0, member: 0, gift: 0, like: 0, roomUser: 0 }, fixture: false };
}
