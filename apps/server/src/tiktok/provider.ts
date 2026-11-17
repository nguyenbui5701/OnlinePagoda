import { initialLiveState, normalizeUsername, type LiveConnectionState, type RawEvent } from '@vuonsen/shared';
import type { LiveProvider } from '../provider';
import { classifyLiveError, type LiveFault } from './errors';
import { mapTikTokEvent, webcastTypes } from './mapper';
import { WorkerConnectorTransport, type ConnectorFactory, type ConnectorTransport } from './transport';

export class TikTokLiveProvider implements LiveProvider {
  readonly source = 'tiktok' as const;
  state = initialLiveState();
  private events = new Set<(event: RawEvent) => void>();
  private statuses = new Set<(state: LiveConnectionState) => void>();
  private drops = new Set<(reason: string, count: number) => void>();
  private transport?: ConnectorTransport;
  private detach: (() => void)[] = [];
  private retryTimer?: ReturnType<typeof setTimeout>;
  private connectTimer?: ReturnType<typeof setTimeout>;
  private teardown = Promise.resolve();
  private generation = 0;
  private wanted = false;
  private rateLimitUntil = 0;
  constructor(private factory: ConnectorFactory = username => new WorkerConnectorTransport(username), private random = Math.random, private now = Date.now, fixture = false) { this.state.fixture = fixture; }
  onEvent(listener: (event: RawEvent) => void) { this.events.add(listener); return () => { this.events.delete(listener); }; }
  onStatus(listener: (state: LiveConnectionState) => void) { this.statuses.add(listener); return () => { this.statuses.delete(listener); }; }
  onDrop(listener: (reason: string, count: number) => void) { this.drops.add(listener); return () => { this.drops.delete(listener); }; }
  private notify() { this.statuses.forEach(listener => listener(this.snapshot())); }
  snapshot(): LiveConnectionState { return { ...this.state, received: { ...this.state.received } }; }
  private drop(reason: string, count = 1) { this.drops.forEach(listener => listener(reason, count)); }
  private clearTimers() { clearTimeout(this.retryTimer); clearTimeout(this.connectTimer); this.retryTimer = undefined; this.connectTimer = undefined; }
  private stopTransport() {
    const transport = this.transport; this.transport = undefined;
    // EventEmitter 'error' remains handled while a discarded attempt finishes cancelling.
    transport?.on('error', () => {});
    this.detach.splice(0).forEach(off => off());
    this.teardown = this.teardown.then(() => transport?.disconnect()).then(() => {}, () => {});
    return this.teardown;
  }
  async connect(input = this.state.username): Promise<void> {
    const username = normalizeUsername(input);
    if (!username) throw new Error('Tên kênh TikTok không hợp lệ.');
    if (this.now() < this.rateLimitUntil) throw new Error('Dịch vụ đang giới hạn yêu cầu. Cần chờ hết thời gian thông báo.');
    if (this.wanted && username === this.state.username && ['CONNECTING', 'LIVE_CONNECTED', 'RECONNECTING'].includes(this.state.status)) throw new Error('Kết nối đang hoạt động hoặc đã có lịch thử lại.');
    this.wanted = true; this.generation++; this.clearTimers();
    const changed = this.state.username !== username;
    if (changed) this.state = { ...initialLiveState(), fixture: this.state.fixture };
    Object.assign(this.state, { username, status: 'CONNECTING', attempt: 0, retryAt: null, lastError: null, errorCode: null });
    this.notify();
    const token = this.generation;
    await this.stopTransport();
    if (token === this.generation && this.wanted) this.attempt();
  }
  async retry() {
    if (this.now() < this.rateLimitUntil) throw new Error('Chưa hết thời gian giới hạn. Không thể thử lại sớm.');
    if (this.state.status === 'CONNECTING' || this.state.status === 'LIVE_CONNECTED') throw new Error('Đang kết nối hoặc đã kết nối.');
    this.wanted = false; await this.connect();
  }
  async disconnect(): Promise<void> {
    this.wanted = false; this.generation++; this.clearTimers();
    Object.assign(this.state, { status: 'DISCONNECTED', retryAt: null, connectedAt: null }); this.notify();
    await this.stopTransport();
  }
  private attempt() {
    if (!this.wanted) return;
    const token = ++this.generation, startedAt = this.now();
    this.state.status = this.state.attempt ? 'RECONNECTING' : 'CONNECTING'; this.state.retryAt = null; this.notify();
    let transport: ConnectorTransport;
    try { transport = this.factory(this.state.username); this.transport = transport; }
    catch (error) { this.fail(token, error); return; }
    const current = () => this.wanted && token === this.generation && this.transport === transport;
    const listen = (event: string, handler: (...args: any[]) => void) => {
      const safe = (...args: any[]) => { if (!current()) return; try { handler(...args); } catch (error) { this.fail(token, error); } };
      transport.on(event, safe); this.detach.push(() => { transport.off(event, safe); });
    };
    listen('error', error => this.fail(token, error));
    listen('disconnected', () => this.fail(token, { name: 'TransportClosedError' }));
    listen('streamEnd', () => this.fail(token, { name: 'StreamEnded' }));
    listen('dropped', (count: unknown) => { if (typeof count === 'number' && Number.isSafeInteger(count) && count > 0) this.drop('Giới hạn bộ đệm connector', count); });
    for (const type of webcastTypes) listen(type, (raw: unknown) => {
      if (this.state.status !== 'LIVE_CONNECTED' || !this.state.roomId) { this.drop('Bỏ batch trước khi kết nối sẵn sàng'); return; }
      this.state.received[type]++; this.state.lastEventAt = this.now();
      const result = mapTikTokEvent(type, raw, this.state.roomId, startedAt);
      if (result.kind === 'viewers') { this.state.viewers = result.total; this.state.viewersAt = this.now(); }
      else if ((result.kind === 'event'||result.kind === 'progress')) this.events.forEach(listener => listener(result.event));
      else this.drop(result.reason);
    });
    this.connectTimer = setTimeout(() => this.fail(token, { name: 'ConnectTimeoutError' }), 30000);
    void transport.connect().then(result => {
      if (!current()) return;
      if (typeof result.roomId !== 'string' || !/^[1-9]\d{0,29}$/.test(result.roomId)) { this.fail(token, new Error('Invalid room')); return; }
      clearTimeout(this.connectTimer); this.connectTimer = undefined;
      if (this.state.roomId && this.state.roomId !== result.roomId) {
        this.state.received = { chat: 0, member: 0, gift: 0, like: 0, roomUser: 0 }; this.state.viewers = null; this.state.viewersAt = null; this.state.lastEventAt = null;
      }
      Object.assign(this.state, { status: 'LIVE_CONNECTED', roomId: result.roomId, connectedAt: this.now(), retryAt: null, attempt: 0, lastError: null, errorCode: null });
      this.notify();
    }).catch(error => { if (current()) this.fail(token, error); });
  }
  private fail(token: number, error: unknown) {
    if (token !== this.generation || !this.wanted) return;
    this.generation++; this.clearTimers();
    const fault = classifyLiveError(error, this.now());
    Object.assign(this.state, { connectedAt: null, lastError: fault.message, errorCode: fault.code, retryAt: null });
    this.state.status = fault.kind === 'offline' ? 'LIVE_OFFLINE' : fault.kind === 'rate-limit' ? 'RATE_LIMITED' : fault.kind === 'network' ? 'RECONNECTING' : 'ERROR';
    if (fault.kind === 'rate-limit') this.rateLimitUntil = Math.max(this.rateLimitUntil, this.now() + (fault.retryAfterMs || 60000));
    const retry = fault.kind === 'network' || fault.kind === 'rate-limit';
    if (retry && this.state.attempt < 5) {
      this.state.attempt++;
      const exponential = Math.min(30000, 2000 * 2 ** (this.state.attempt - 1));
      const delay = fault.kind === 'rate-limit' ? Math.max(60000, this.rateLimitUntil - this.now()) : Math.min(30000, Math.max(2000, Math.round(exponential * (0.8 + this.random() * 0.4))));
      this.state.retryAt = this.now() + delay;
      const generation = this.generation;
      // Never exceed setTimeout's integer limit (which would otherwise retry immediately).
      const schedule = () => {
        const remaining = (this.state.retryAt || 0) - this.now();
        this.retryTimer = setTimeout(() => {
          if (!this.wanted || generation !== this.generation) return;
          if (this.now() < (this.state.retryAt || 0)) { schedule(); return; }
          void this.teardown.then(() => { if (this.wanted && generation === this.generation) this.attempt(); });
        }, Math.min(2147483647, Math.max(0, remaining)));
      };
      schedule();
    } else if (retry) {
      if (fault.kind !== 'rate-limit') this.state.status = 'ERROR';
      this.state.lastError = `${fault.message} Đã dừng sau 5 lần thử lại.`;
    }
    void this.stopTransport(); this.notify();
  }
}
