import { EventEmitter } from 'node:events';
import type { ConnectorTransport } from '../../apps/server/src/tiktok/transport';

export const ROOM = '7444444444444444444';
export const rawChat = (id = '9123456789012345678', content = 'cầu an', msgId?: string) => ({
  user: { id, displayId: `guest_${id.slice(-4)}`, nickname: 'An Nhiên 🌸' }, content,
  common: { roomId: ROOM, ...(msgId ? { msgId } : {}) }
});
export const rawGift = (count: number, end: number, msgId: string, extra: Record<string, unknown> = {}) => ({
  ...rawChat(), giftId: '5655', gift: { type: 1 }, repeatCount: count, repeatEnd: end, groupId: '900001',
  common: { roomId: ROOM, msgId }, ...extra
});
export class FakeConnector extends EventEmitter implements ConnectorTransport {
  connected = false; disconnected = false; connectCalls = 0; listenersAtConnect = 0;
  private rejectPending?: (error: unknown) => void;
  private resolvePending?: (value: { roomId: string }) => void;
  constructor(public behavior: 'success' | 'pending' | { error: unknown } = 'success', public room = ROOM) { super(); }
  async connect() {
    this.connectCalls++; this.listenersAtConnect = this.listenerCount('chat');
    if (typeof this.behavior === 'object') { this.emit('error', this.behavior.error); throw this.behavior.error; }
    if (this.behavior === 'pending') return new Promise<{ roomId: string }>((resolve, reject) => { this.resolvePending = resolve; this.rejectPending = reject; });
    this.connected = true; return { roomId: this.room };
  }
  resolve() { this.connected = true; this.resolvePending?.({ roomId: this.room }); }
  async disconnect() { this.disconnected = true; this.connected = false; this.rejectPending?.({ name: 'AbortError' }); }
}
