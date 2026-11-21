import { CommunityPanel } from './CommunityPanel';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { connectScene } from '../../../packages/shared/src/client';
import { type Command, type Reply, type SceneState, type Settings } from '@vuonsen/shared';
import './style.css';
import { LivePanel } from './LivePanel';
import { AppearancePanel } from './AppearancePanel';
import {CameraPanel} from './CameraPanel';
import { ScenePanel } from './ScenePanel';
import { GiftAudioPanel } from './GiftAudioPanel';
import { FortunePanel } from './FortunePanel';
import { LanternPanel } from './LanternPanel';

function Dashboard() {
  const [state, setState] = useState<SceneState>(); const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState(''); const [selected, setSelected] = useState('');
  const [nickname, setNickname] = useState('Khách An Lành'); const [userId, setUserId] = useState('khach-thu'); const [chat, setChat] = useState('cầu an');
  const [name, setName] = useState(''); const [resetConfirm, setResetConfirm] = useState(false);
  const socket = useRef<ReturnType<typeof connectScene> | null>(null);
  const pendingSettings = useRef<Partial<Settings>>({});
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const s = connectScene('dashboard', value => setState({ ...value, settings: { ...value.settings, ...pendingSettings.current } })); socket.current = s;
    s.on('connect', () => setConnected(true)); s.on('disconnect', () => setConnected(false));
    return () => { clearTimeout(settingsTimer.current); s.disconnect(); };
  }, []);
  useEffect(() => { if (state) setName(state.settings.templeName); }, [state?.settings.templeName]);
  const send = (command: Command) => {
    if (!socket.current?.connected) { setMessage('Server chưa kết nối. Kiểm tra cửa sổ chạy ứng dụng.'); return; }
    // A newly enabled feature must be saved before its DEMO/source/action command.
    flushSettings(() => socket.current?.timeout(4000).emit('command', command, (error: Error | null, reply: Reply) => setMessage(error ? 'Hết thời gian chờ server' : reply?.ok ? 'Đã gửi thao tác' : reply?.error || 'Không thực hiện được')));
  };
  const flushSettings = (afterSaved?:()=>void) => {
    clearTimeout(settingsTimer.current);
    const sent = { ...pendingSettings.current };
    if (!Object.keys(sent).length) {afterSaved?.();return;}
    socket.current?.timeout(4000).emit('command', { type: 'settings', patch: sent }, (error: Error | null, reply: Reply) => {
      for (const key of Object.keys(sent) as (keyof Settings)[]) if (pendingSettings.current[key] === sent[key]) delete pendingSettings.current[key];
      setMessage(error ? 'Chưa lưu được cài đặt' : reply?.ok ? 'Đã lưu cài đặt' : reply?.error || 'Không lưu được cài đặt');
      if (error || !reply?.ok) socket.current?.emit('resync');
      else afterSaved?.();
    });
  };
  const settings = (patch: Partial<Settings>) => {
    if (!socket.current?.connected) { setMessage('Server chưa kết nối.'); return; }
    pendingSettings.current = { ...pendingSettings.current, ...patch };
    setState(current => current ? { ...current, settings: { ...current.settings, ...patch } } : current);
    clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(() => flushSettings(), 140);
  };
  const action = (kind: 'lotus' | 'pray' | 'gift') => {
    const actor = state?.actors.find(a => a.key === selected) || state?.actors[0];
    const id = actor ? decodeURIComponent(actor.key.split(':').at(-1)!) : userId;
    const identity = actor?.key.includes(':uniqueId:') ? { uniqueId: id } : { userId: id };
    send({ type: 'event', event: { ...identity, type: kind === 'gift' ? 'gift' : 'chat', nickname: actor?.displayName || nickname, text: kind === 'lotus' ? 'cầu an' : 'lễ phật', eventId: crypto.randomUUID(), ...(kind === 'gift' ? { gift: { id: 'lotus-demo', count: 1, finished: true, streakId: crypto.randomUUID() } } : {}) } });
  };
  const s = state?.settings;
  const demoEnabled = connected && state?.mode !== 'tiktok';
  return <div className="shell">
    <aside className="sidebar"><a className="brand" href="/dashboard/"><span className="lotus-mark">❋</span><span>VƯỜN SEN<small>AN LÀNH</small></span></a><div className="nav-label">KHÔNG GIAN CỦA BẠN</div><a className="nav active" href="#studio">◉ <span>Phòng điều khiển</span></a><a className="nav" href="#settings">⚙ <span>Cài đặt khung cảnh</span></a><a className="nav" href="#guide">↗ <span>Hướng dẫn OBS</span></a><div className="side-note"><span className="pill">{state?.mode === 'tiktok' ? 'TIKTOK LIVE' : 'DEMO · CỤC BỘ'}</span><p>Một khoảng lặng,<br/>một lời bình an.</p><small>DEMO luôn sẵn sàng.<br/>LIVE công khai qua adapter.</small></div></aside>
    <main id="studio"><header><div><div className="eyebrow">VƯỜN SEN / STUDIO</div><h1>Phòng điều khiển</h1><p>Chào đón những vị khách ghé thăm khu vườn.</p></div><a className="button outline" href="/overlay/" target="_blank" rel="noreferrer">Mở Overlay ↗</a></header>
    <div className="connection"><span><i className={connected ? 'dot' : 'dot offline'}/>Server {connected ? 'đã kết nối' : 'đang kết nối lại'}</span><span><i className={state?.metrics.overlayCount ? 'dot' : 'dot offline'}/>Overlay {state?.metrics.overlayCount ? `${state.metrics.overlayCount} đang mở` : 'đang khởi tạo'}</span><span className="demo-badge">{state?.mode === 'tiktok' ? 'NGUỒN TIKTOK LIVE' : 'CHẾ ĐỘ GIẢ LẬP'}</span></div>
    <LivePanel state={state} connected={connected} send={send} updateSettings={settings}/><div className="studio-grid"><section className="controls"><div className="metrics"><article><span>Ghế đã cấp</span><strong data-testid="actors">{state?.room?.seated ?? state?.actors.length ?? 0}<small> / {s?.maxActors || 100}</small></strong></article><article><span>Đang chờ ghế</span><strong data-testid="queue">{state?.queue || 0}</strong></article><article><span>Khung hình</span><strong>{state?.metrics.fps || '—'}<small> FPS</small></strong></article><article><span>Đã tham gia</span><strong>{state?.total || 0}</strong></article></div>
    <fieldset className="demo-controls" disabled={!demoEnabled}><section className="card"><div className="card-heading"><div><span className="eyebrow">01 / KHÁCH GHÉ THĂM</span><h2>Gửi một lời chào</h2></div><span className="round-icon">♧</span></div><p>Thêm khách giả lập. Mỗi người có một chỗ ngồi riêng.</p><div className="add-buttons">{([1, 10, 100] as const).map(n => <button disabled={!demoEnabled} className={n === 10 ? 'primary' : ''} key={n} onClick={() => send({ type: 'add', count: n })}>+{n} người</button>)}</div><div className="divider"/><label>Người thực hiện<select aria-label="Người thực hiện" value={selected} onChange={e => setSelected(e.target.value)}><option value="">{state?.actors.length ? 'Khách đầu tiên trong sân' : 'Khách An Lành (tạo mới khi chat)'}</option>{state?.actors.map(a => <option key={a.key} value={a.key}>{a.displayName}</option>)}</select></label><div className="ritual-buttons"><button onClick={() => action('lotus')}><span aria-hidden="true">❀</span>Cầu an</button><button onClick={() => action('pray')}><span aria-hidden="true">♧</span>Lễ Phật</button><button onClick={() => action('gift')}><span aria-hidden="true">✧</span>Gift thử</button></div><small className="muted">Hiệu ứng cùng loại có thời gian nghỉ 5 giây / người.</small></section>
    <section className="card"><span className="eyebrow">02 / BÌNH LUẬN GIẢ LẬP</span><h2>Thử tương tác của một người</h2><div className="two-fields"><label>ID ổn định<input aria-label="ID ổn định" maxLength={160} value={userId} onChange={e => setUserId(e.target.value)}/></label><label>Tên hiển thị<input maxLength={500} value={nickname} onChange={e => setNickname(e.target.value)}/></label></div><form onSubmit={e => { e.preventDefault(); send({ type: 'event', event: { type: 'chat', userId, nickname, text: chat, eventId: crypto.randomUUID() } }); }}><label>Bình luận<input aria-label="Bình luận" maxLength={1000} value={chat} onChange={e => setChat(e.target.value)}/></label><button className="wide" disabled={!demoEnabled}>Gửi bình luận giả lập ↗</button></form><small className="muted">Gửi nhiều lần cùng ID vẫn chỉ có một nhân vật.</small></section>
    </fieldset><section className="card" id="settings"><span className="eyebrow">03 / KHÔNG GIAN</span><h2>Cài đặt khung cảnh</h2><form className="name-form" onSubmit={e => { e.preventDefault(); settings({ templeName: name }); }}><label>Tên chùa<input value={name} maxLength={48} onChange={e => setName(e.target.value)}/></label><button>Lưu tên</button></form><div className="toggles">{([['showGuide','Bảng hướng dẫn'],['showRegister','Sổ lưu danh'],['showLabels','Tên nhân vật'],['effects','Ánh sáng, khói & hoa'],['showGiftThanks','Lời cảm ơn quà'],['autoJoinChat','Vào sân khi bình luận'],['autoJoinMember','Vào sân khi có member']] as const).map(([key, title]) => <label className="toggle" key={key}><span>{title}</span><input type="checkbox" checked={s?.[key] ?? false} onChange={e => settings({ [key]: e.target.checked })}/></label>)}</div><div className="sliders">{([['animationSpeed','Tốc độ hoạt ảnh',0.4,3,0.1],['effectIntensity','Mật độ hiệu ứng',0,1,0.1],['maxActors','Số chỗ trong sân',1,100,1],['idleMinutes','Rời sân sau (phút)',0.1,30,0.1],['safeRight','Lề phải an toàn (px)',0,160,10],['safeBottom','Lề dưới an toàn (px)',0,240,10]] as const).map(([key,title,min,max,step]) => <label key={key}><span>{title}<b>{s?.[key]}</b></span><input aria-label={title} type="range" min={min} max={max} step={step} value={s?.[key] ?? min} onChange={e => settings({ [key]: Number(e.target.value) })}/></label>)}</div></section>
    <CameraPanel state={state} connected={connected} update={settings} send={send}/><ScenePanel state={state} connected={connected} update={settings} send={send}/><CommunityPanel state={state} connected={connected} update={settings} send={send}/><LanternPanel state={state} connected={connected} update={settings} send={send}/><FortunePanel state={state} connected={connected} update={settings} send={send}/><AppearancePanel settings={s} update={settings} connected={connected}/><GiftAudioPanel state={state} connected={connected} update={settings} send={send}/></section><aside className="preview-column"><section className="preview-card"><div className="preview-heading"><span><i className="dot"/> XEM TRƯỚC</span><span>9:16 · 1080 × 1920</span></div><iframe title="Xem trước Vườn Sen" src="/overlay/"/><div className="preview-footer">Khung hình sạch dành cho OBS <a href="/overlay/" target="_blank" rel="noreferrer">↗</a></div></section>
    <section className="card log-card"><div className="card-heading"><h2>Nhật ký phiên</h2><span>{state?.metrics.perSecond || 0} sự kiện/s</span></div><p className="muted">{state?.metrics.dropped || 0} bỏ qua · {state?.metrics.pending || 0} đang xử lý</p><div className="logs" aria-label="Nhật ký phiên">{state?.logs.length ? state.logs.slice(0, 30).map(log => <div key={log.id}><time>{new Date(log.at).toLocaleTimeString('vi-VN')}</time><span>{log.text}</span></div>) : <p>Chờ lời chào đầu tiên…</p>}</div><details><summary>Lý do bỏ qua</summary>{Object.entries(state?.metrics.reasons || {}).map(([k,v]) => <p key={k}>{k}: {v}</p>)}</details></section>
    <section className="card" id="guide"><h2>Đưa khu vườn lên OBS</h2><ol><li>Thêm nguồn <b>Browser Source</b>.</li><li>URL: <code>{location.origin}/overlay</code></li><li>Đặt Width <b>1080</b>, Height <b>1920</b>, FPS <b>30</b>.</li></ol><p className="muted">Tải lại nguồn sẽ khôi phục phiên từ server. Âm thanh cần bật bằng thao tác người dùng; nhấn A trong Overlay để mở điều khiển.</p></section>
    <section className="card recovery"><h2>Kiểm tra phục hồi</h2><p>Nguồn demo: <b>{state?.provider === 'reconnecting' ? 'Đang kết nối lại…' : 'Sẵn sàng'}</b></p><div className="two-fields"><button disabled={!demoEnabled} onClick={() => send({ type: 'disconnect' })}>Giả lập mất kết nối</button><button disabled={!demoEnabled} onClick={() => send({ type: 'retry' })}>Kết nối lại</button></div><button disabled={!demoEnabled} className="danger wide" onClick={() => { if (resetConfirm) { send({ type: 'reset' }); setResetConfirm(false); } else setResetConfirm(true); }}>{resetConfirm ? 'Xác nhận xoá toàn bộ phiên' : 'Reset · Xoá phiên demo'}</button>{resetConfirm && <button className="wide" onClick={() => setResetConfirm(false)}>Huỷ xoá</button>}</section></aside></div>
    <footer>VƯỜN SEN AN LÀNH <span>Giai đoạn 3.1 · DEMO & LIVE · {state?.metrics.quality || 'Đang khởi tạo'}</span></footer><div className="status-message" role="status">{message}</div></main>
  </div>;
}
createRoot(document.getElementById('root')!).render(<Dashboard/>);
