import { type Settings, type SourceMode } from '@vuonsen/shared';
import { SceneEngine } from './engine';
import { MockLiveProvider } from './provider';
import { TikTokLiveProvider } from './tiktok/provider';
import type { ConnectorFactory } from './tiktok/transport';

export class SourceManager {
  readonly demo: SceneEngine; readonly live: SceneEngine;
  readonly mock = new MockLiveProvider(); readonly tiktok: TikTokLiveProvider;
  mode: SourceMode = 'demo';
  private mockTimer?: ReturnType<typeof setTimeout>;
  private room = ''; private channel = ''; private disposers: (() => void)[] = [];
  constructor(settings: Settings, factory?: ConnectorFactory, fixture = false) {
    this.demo = new SceneEngine(settings); this.live = new SceneEngine(settings); this.live.mode = 'tiktok';
    this.tiktok = new TikTokLiveProvider(factory, Math.random, Date.now, fixture);
    this.tiktok.state.username = settings.tiktokUsername;
    this.disposers.push(this.mock.onEvent(event => { if (this.mode === 'demo') this.demo.receive(event); }));
    this.disposers.push(this.tiktok.onEvent(event => { if (this.mode === 'tiktok') this.live.receive(event); }));
    this.disposers.push(this.tiktok.onDrop((reason, count) => this.live.drop(reason, count)));
    this.disposers.push(this.tiktok.onStatus(state => {
      if (state.status === 'LIVE_CONNECTED' && state.roomId) {
        if (this.room && this.room !== state.roomId) this.live.reset();
        this.room = state.roomId;
      }
      this.live.provider = state.status === 'LIVE_CONNECTED' ? 'connected' : 'reconnecting';
      this.live.log(`TikTok · ${state.status}${state.lastError ? ` · ${state.lastError}` : ''}`);
    }));
    this.mock.connect();
  }
  get current() { return this.mode === 'demo' ? this.demo : this.live; }
  snapshot() { return { ...this.current.snapshot(), mode: this.mode, connection: this.tiktok.snapshot() }; }
  async switchTo(mode: SourceMode) {
    if (mode === this.mode) return;
    // Drop pending cards on a source switch without touching actors, gifts or daily limits.
    this.demo.clearFortuneDisplay(); this.live.clearFortuneDisplay();
    this.demo.clearLanternDisplay(); this.live.clearLanternDisplay();
    this.demo.clearCommunityDisplay();this.live.clearCommunityDisplay();
    clearTimeout(this.mockTimer);
    if (mode === 'demo') { this.mode = 'demo'; this.mock.connect(); this.demo.provider = 'connected'; await this.tiktok.disconnect(); }
    else { this.mock.disconnect(); this.mode = 'tiktok'; }
  }
  async connectLive(username: string) {
    if (this.mode !== 'tiktok') throw new Error('Chọn nguồn TIKTOK LIVE trước khi kết nối.');
    if (this.channel && this.channel !== username) { this.live.reset(); this.room = ''; }
    this.channel = username;
    await this.tiktok.connect(username);
  }
  updateSettings(settings: Settings) { this.demo.updateSettings(settings); this.live.updateSettings(settings); }
  reconnectDemo() { clearTimeout(this.mockTimer); this.mock.connect(); this.demo.provider = 'connected'; this.demo.log('Nguồn demo đã kết nối'); }
  disconnectDemo() {
    clearTimeout(this.mockTimer); this.mock.disconnect(); this.demo.provider = 'reconnecting'; this.demo.log('Giả lập mất nguồn · tự kết nối lại sau khoảng 2 giây');
    this.mockTimer = setTimeout(() => { if (this.mode === 'demo') this.reconnectDemo(); }, 2000 + Math.random() * 500);
  }
  async shutdown() { clearTimeout(this.mockTimer); this.mock.disconnect(); this.disposers.splice(0).forEach(off => off()); await this.tiktok.disconnect(); }
}
