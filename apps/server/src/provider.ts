import type { RawEvent } from '@vuonsen/shared';
export interface LiveProvider {
  readonly source: 'demo' | 'tiktok';
  connect(username?: string): void | Promise<void>; disconnect(): void | Promise<void>;
  onEvent(listener: (event: RawEvent) => void): () => void;
}
const names = ['An Nhiên', 'Minh Tâm', 'Thanh Trúc', 'Diệu Linh', 'Tuệ An', 'Ngọc Mai', 'Bảo Bình', 'Hải Yến', 'Thiện Phúc', 'Khánh Vân', 'Như Ý', 'Tâm Sen'];
// Synthetic DEMO comments only. Never substitute these for actual TikTok chat.
export const demoGreetings = [
  'Xin chào cả nhà!', 'Chào mọi người, mình mới ghé chùa.',
  'Chúc cả nhà một ngày nhẹ nhàng.', 'Mình ghé ngồi yên một chút.',
  'Không gian hôm nay thật ấm áp.', 'Chào cả nhà, rất vui được gặp mọi người.',
  'Mình ghé nghe tiếng chuông.', 'Chúc mọi người luôn vui vẻ.',
  'Xin gửi cả nhà một lời chào.', 'Hôm nay mình cùng ngồi tĩnh tâm nhé.',
  'Một chút lắng lòng sau ngày dài.', 'Chào chùa, mình lại ghé thăm.'
] as const;
export class MockLiveProvider implements LiveProvider {
  readonly source = 'demo' as const;
  private listeners = new Set<(event: RawEvent) => void>(); private serial = 0; connected = false;
  connect() { this.connected = true; }
  disconnect() { this.connected = false; }
  onEvent(listener: (event: RawEvent) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  emit(event: RawEvent) { if (this.connected) this.listeners.forEach(listener => listener(event)); }
  add(count: number) {
    for (let i = 0; i < count; i++) { const id = ++this.serial; this.emit({ type: 'chat', userId: `guest-${id}`, eventId: `join-${id}`, nickname: `${names[(id - 1) % names.length]} ${id}`, text: demoGreetings[(id - 1) % demoGreetings.length] }); }
  }
}
