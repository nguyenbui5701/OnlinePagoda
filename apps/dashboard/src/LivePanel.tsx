import { useEffect, useState } from 'react';
import { normalizeUsername, type Command, type SceneState, type Settings } from '@vuonsen/shared';

const statusLabels = {
  DEMO: 'DEMO · nguồn giả lập', CONNECTING: 'CONNECTING · đang kết nối',
  LIVE_CONNECTED: 'LIVE_CONNECTED · đã nhận kết nối', LIVE_OFFLINE: 'LIVE_OFFLINE · kênh chưa LIVE',
  RECONNECTING: 'RECONNECTING · đang thử lại', RATE_LIMITED: 'RATE_LIMITED · cần chờ',
  ERROR: 'ERROR · kết nối có lỗi', DISCONNECTED: 'DISCONNECTED · đã ngắt'
};
export function LivePanel({ state, connected, send, updateSettings }: {
  state?: SceneState; connected: boolean; send: (command: Command) => void; updateSettings: (patch: Partial<Settings>) => void;
}) {
  const [username, setUsername] = useState(''); const [validation, setValidation] = useState('');
  useEffect(() => { setUsername(state?.settings.tiktokUsername || ''); }, [state?.settings.tiktokUsername]);
  const mode = state?.mode || 'demo', live = state?.connection;
  const status = mode === 'demo' ? 'DEMO' : live?.status || 'DISCONNECTED';
  const busy = ['CONNECTING', 'RECONNECTING', 'LIVE_CONNECTED'].includes(status);
  const delay = live?.retryAt ? Math.max(0, Math.ceil((live.retryAt - (state?.serverTime || Date.now())) / 1000)) : 0;
  const counts = live?.received;
  const connect = () => {
    const value = normalizeUsername(username);
    if (!value) { setValidation('Nhập @username hoặc URL TikTok LIVE hợp lệ.'); return; }
    setValidation(''); setUsername(value); send({ type: 'live-connect', username: value });
  };
  return <section className="card live-card" aria-labelledby="live-title">
    <div className="card-heading"><div><span className="eyebrow">NGUỒN TƯƠNG TÁC</span><h2 id="live-title">Kết nối TikTok LIVE</h2></div>
      <div className="source-switch" role="group" aria-label="Chọn nguồn">
        <button type="button" aria-pressed={mode === 'demo'} disabled={!connected} onClick={() => send({ type: 'source', mode: 'demo' })}>DEMO</button>
        <button type="button" aria-pressed={mode === 'tiktok'} disabled={!connected} onClick={() => send({ type: 'source', mode: 'tiktok' })}>TIKTOK LIVE</button>
      </div>
    </div>
    <p className="live-notice">Đây là phần mềm tương tác không chính thức, không thuộc TikTok. LIVE cần Internet và dịch vụ ký bên thứ ba; DEMO dùng được offline.</p>
    {live?.fixture && <div className="fixture-banner" role="status">KIỂM THỬ FIXTURE · dữ liệu giả lập connector, không phải LIVE thật.</div>}
    <div className="live-form"><label>Tên kênh TikTok<input aria-label="Tên kênh TikTok" autoComplete="off" spellCheck={false} maxLength={250} value={username} disabled={busy} placeholder="@username hoặc URL TikTok LIVE" onChange={e => { setUsername(e.target.value); setValidation(''); }}/></label>
      <div className="live-buttons"><button className="primary" disabled={!connected || mode !== 'tiktok' || busy || delay > 0} onClick={connect}>Kết nối</button>
        <button disabled={!connected || mode !== 'tiktok' || status === 'DISCONNECTED'} onClick={() => send({ type: 'live-disconnect' })}>Ngắt kết nối</button>
        <button disabled={!connected || mode !== 'tiktok' || !live?.username || status === 'CONNECTING' || status === 'LIVE_CONNECTED' || (status === 'RATE_LIMITED' && delay > 0)} onClick={() => send({ type: 'live-retry' })}>Thử lại</button></div>
    </div>
    {validation && <p className="live-error" role="alert">{validation}</p>}
    <div className="live-state"><span className={`live-badge ${status.toLowerCase()}`} data-testid="live-status">{statusLabels[status]}</span>
      {live?.username && <span>Kênh: <b>@{live.username}</b></span>}
      <span>Room ID: <b data-testid="room-id">{live?.roomId || '—'}</b></span>
      {delay > 0 && mode === 'tiktok' && <span>Thử lại sau {delay}s · lần {live?.attempt}/5</span>}
    </div>
    {live?.lastError && mode === 'tiktok' && <p className="live-error" role="status" data-testid="live-error">{live.lastError}</p>}
    <div className="live-options">
      <label className="toggle"><span>Bình luận lần đầu ⇒ thêm người vào chùa</span><input type="checkbox" checked={state?.settings.autoJoinChat ?? true} onChange={e => updateSettings({ autoJoinChat: e.target.checked })}/></label>
      <label className="toggle"><span>Người vừa vào LIVE ⇒ thêm người vào chùa (beta)</span><input type="checkbox" checked={state?.settings.autoJoinMember ?? false} onChange={e => updateSettings({ autoJoinMember: e.target.checked })}/></label>
      <label className="toggle"><span>Like ⇒ hiệu ứng nhẹ</span><input type="checkbox" checked={state?.settings.likeEffects ?? false} onChange={e => updateSettings({ likeEffects: e.target.checked })}/></label>
    </div>
    <small className="muted">Member events có thể không đầy đủ. Bình luận là cách chính để có nhân vật; like không tạo người mới.</small>
    <div className="live-counters">{([['chat', 'Chat'], ['member', 'Member'], ['gift', 'Gift events'], ['like', 'Like events']] as const).map(([key, title]) => <div key={key}><span>{title}</span><b data-testid={`live-${key}`}>{counts?.[key] || 0}</b></div>)}
      <div><span>Nhân vật mới · nguồn hiện tại</span><b>{state?.metrics.newActors || 0}</b></div>
      <div><span>Quà hoàn tất · nguồn hiện tại</span><b data-testid="gift-units">{state?.metrics.giftUnits || 0}</b></div>
    </div>
    <div className="live-details"><span>Event gần nhất: <b>{live?.lastEventAt ? new Date(live.lastEventAt).toLocaleTimeString('vi-VN') : 'Chưa nhận'}</b></span>
      <span>Khán giả theo ROOM_USER: <b>{live?.viewers ?? 'Chưa có dữ liệu'}</b>{live?.viewersAt ? ` · lúc ${new Date(live.viewersAt).toLocaleTimeString('vi-VN')}` : ''}</span>
      <span>Trong sân: <b>{state?.actors.length || 0}</b> · Chờ: <b>{state?.queue || 0}</b> · Bỏ qua: <b>{state?.metrics.dropped || 0}</b></span>
    </div>
    <small className="muted">Số khán giả TikTok là lần cập nhật gần nhất, khác số nhân vật trong sân. Chi tiết sự kiện bỏ qua nằm ở Nhật ký phiên. Đổi kênh sẽ bắt đầu sân LIVE mới; chuyển DEMO giữ riêng sân thử nghiệm.</small>
  </section>;
}
