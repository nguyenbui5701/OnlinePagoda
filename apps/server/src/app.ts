import express from 'express';
import { randomUUID } from 'node:crypto';
import legacyGifts from '../../overlay/src/golden/gifts.json';
import { defaultGiftCatalog, giftDefinitions } from '@vuonsen/shared';
import { createServer } from 'node:http';
import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { Server } from 'socket.io';
import { cleanText, commandSchema, defaultSettings, settingsSchema, settingsPatchSchema, type SceneDelta, type SceneState, type Reply } from '@vuonsen/shared';
import { SourceManager } from './sources';
import type { ConnectorFactory } from './tiktok/transport';
import { GiftVoiceService32 } from './voice32';
import { FortuneVoiceService, fortuneVoiceRequestSchema, type FortuneSynth } from './fortune-voice-service';

export async function startServer(options: { port?: number; dataDirectory?: string; connectorFactory?: ConnectorFactory; fixture?: boolean; serveBuilt?: boolean; fortuneSynth?:FortuneSynth } = {}) {
const port = options.port ?? Number(process.env.PORT || 3000);
const dataDirectory = resolve(options.dataDirectory || 'data');
const buildDirectory = resolve(process.env.APP_BUILD_DIRECTORY || 'dist');
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT phải là số từ 1024 đến 65535');
const app = express(), http = createServer(app);
const allowedOrigin = (origin?: string) => !origin || [`http://localhost:${port}`, `http://127.0.0.1:${port}`].includes(origin);
const io = new Server(http, { maxHttpBufferSize: 16_384, allowRequest: (req, callback) => callback(null, allowedOrigin(req.headers.origin)) });
let settings = defaultSettings;
try {
  const stored = existsSync(resolve(dataDirectory, 'settings.json')) ? JSON.parse(readFileSync(resolve(dataDirectory, 'settings.json'), 'utf8')) : {};
  if (!stored.giftCatalog && legacyGifts.mappings.length) stored.giftCatalog = [...defaultGiftCatalog, ...legacyGifts.mappings.map((m: any) => ({...m,group:m.effect==='bell'?'donut':m.effect==='candle'?'heart':'bouquet',thanksTemplateKey:m.effect==='bell'?'donut':m.effect==='candle'?'heart':'bouquet'}))];
  settings = settingsSchema.parse(stored);
}
catch { console.warn('Cài đặt không hợp lệ; sử dụng mặc định.'); }
const sources = new SourceManager(settings, options.connectorFactory, options.fixture);
// OFF by default: enabling sends sanitized TikTok display names and wishes to Google Translate gTTS.
const dynamicVoice32 = new GiftVoiceService32({dataDirectory, enabled:process.env.TTS_DYNAMIC_ENABLED==='1' && !options.fixture});
const fortuneVoice=new FortuneVoiceService({enabled:options.fixture?Boolean(options.fortuneSynth):dynamicVoice32.enabled,
  synth:options.fixture?options.fortuneSynth:undefined,giftBusy:()=>dynamicVoice32.status().activeSyntheses>0});
const lanternVoice=new FortuneVoiceService({kind:'lantern',enabled:options.fixture?Boolean(options.fortuneSynth):dynamicVoice32.enabled,
  synth:options.fixture?options.fortuneSynth:undefined,giftBusy:()=>dynamicVoice32.status().activeSyntheses>0||fortuneVoice.status().running});
let previous: SceneState = sources.snapshot();
const cameraLowFrames=new Map<string,number>();
const telemetry = new Map<string, { fps: number; quality: string; at: number; camera?: import('@vuonsen/shared').CameraDisplay }>();
function saveSettings(patch: unknown) {
  const next = settingsSchema.parse({ ...sources.current.settings, ...settingsPatchSchema.parse(patch) });
  next.templeName = cleanText(next.templeName, 48) || defaultSettings.templeName;
  mkdirSync(dataDirectory, { recursive: true });
  writeFileSync(resolve(dataDirectory, 'settings.tmp'), JSON.stringify(next.cameraRemember?next:{...next,cameraView:'front',cameraAuto:false,cameraDriftEnabled:false,cameraGiftFocusEnabled:false}, null, 2));
  renameSync(resolve(dataDirectory, 'settings.tmp'), resolve(dataDirectory, 'settings.json'));
  sources.updateSettings(next);
}
let sourceOperation = false;
let audioOwner: string | undefined;
io.on('connection', socket => {
  const overlay = socket.handshake.auth.role === 'overlay';
  socket.join(overlay ? 'overlays' : 'dashboards');
  socket.emit('snapshot', sources.snapshot());
  socket.on('resync', () => socket.emit('snapshot', sources.snapshot()));
  socket.on('audio-claim', (ack) => {
    if (typeof ack !== 'function' || !overlay) return;
    if (audioOwner && audioOwner !== socket.id) { ack({ok:false,error:'Âm thanh đang phát ở một Overlay khác. Tắt ở cửa sổ đó trước.'}); return; }
    audioOwner=socket.id; ack({ok:true});
  });
  socket.on('audio-release', () => { if (audioOwner===socket.id) audioOwner=undefined; });
  socket.on('telemetry', (value: unknown) => {
    if (!overlay || typeof value !== 'object' || !value) return;
    const v = value as { fps?: unknown; quality?: unknown;camera?:unknown };
    const c=v.camera as {view?:unknown;capture?:unknown;errors?:unknown}|undefined;
    let camera:import('@vuonsen/shared').CameraDisplay|undefined;
    if(c&&['front','left','right','wide'].includes(String(c.view))&&typeof c.capture==='boolean'){
      const errors:import('@vuonsen/shared').CameraDisplay['errors']={};
      if(c.errors&&typeof c.errors==='object')for(const [key,error] of Object.entries(c.errors))if(['front','left','right','wide'].includes(key)&&typeof error==='string')errors[key as keyof typeof errors]=cleanText(error,180);
      camera={view:c.view as import('@vuonsen/shared').CameraView,capture:c.capture,errors};
    }
    if(camera?.capture&&typeof v.fps==='number'&&Number.isFinite(v.fps)){
      const low=v.fps<24?(cameraLowFrames.get(socket.id)??0)+1:0;cameraLowFrames.set(socket.id,low);
      if(low>=3&&(sources.current.settings.cameraAuto||sources.current.settings.cameraDriftEnabled||sources.current.settings.cameraGiftFocusEnabled))sources.current.cameraDirector.pause('Capture dưới 24 FPS trong 3 lần đo; bật lại camera để tiếp tục.');
    }
    if (typeof v.fps === 'number' && Number.isFinite(v.fps) && v.fps >= 0 && v.fps <= 240) telemetry.set(socket.id, { fps: v.fps, quality: v.quality === 'reduced' ? 'Giảm hạt / khói' : 'Đầy đủ', at: Date.now(),camera });
  });
  let windowAt = Date.now(), commands = 0;
  socket.on('command', async (raw: unknown, ack?: (reply: Reply) => void) => {
    const reply = (r: Reply) => { if (typeof ack === 'function') ack(r); };
    if (overlay) { reply({ ok: false, error: 'Overlay chỉ nhận trạng thái' }); return; }
    if (Date.now() - windowAt > 1000) { windowAt = Date.now(); commands = 0; }
    if (++commands > 20) { reply({ ok: false, error: 'Thao tác quá nhanh, thử lại sau 1 giây' }); return; }
    const parsed = commandSchema.safeParse(raw);
    if (!parsed.success) { reply({ ok: false, error: 'Dữ liệu không hợp lệ' }); return; }
    const cmd = parsed.data;
    const controlsSource = ['source', 'live-connect', 'live-disconnect', 'live-retry'].includes(cmd.type);
    if (controlsSource && sourceOperation) { reply({ ok: false, error: 'Đang thay đổi nguồn. Vui lòng chờ một chút.' }); return; }
    if (controlsSource) sourceOperation = true;
    try {
      if (cmd.type === 'add' || cmd.type === 'event' || cmd.type === 'gift-demo') {
        if (sources.mode !== 'demo') { reply({ ok: false, error: 'Chuyển sang DEMO để dùng dữ liệu giả lập.' }); return; }
        if (!sources.mock.connected) { reply({ ok: false, error: 'Nguồn demo đang ngắt. Bấm Kết nối lại.' }); return; }
        if (cmd.type === 'add') sources.mock.add(cmd.count);
        else if (cmd.type === 'gift-demo') {
          const definition=giftDefinitions.find(d=>d.group===cmd.group)!;
          sources.mock.emit({type:'gift',source:'demo',userId:cmd.userId,nickname:cmd.nickname,eventId:randomUUID(),gift:{id:`demo:${cmd.group}`,name:definition.label,demoGroup:cmd.group,count:cmd.units,finished:true}});
        } else sources.mock.emit(cmd.event);
      } else if (cmd.type === 'reset') {
        if (sources.mode !== 'demo') { reply({ ok: false, error: 'Reset thử nghiệm chỉ dùng trong DEMO; không xoá nhầm phiên LIVE.' }); return; }
        sources.demo.reset(); sources.reconnectDemo();
      }
      else if(cmd.type==='camera-view'){
        saveSettings({cameraView:cmd.view,cameraAuto:false});sources.current.selectCamera(cmd.view);
      }
      else if(cmd.type==='camera-stop'){
        saveSettings({cameraAuto:false,cameraDriftEnabled:false,cameraGiftFocusEnabled:false});sources.current.cameraDirector.settle(Date.now());
      }
      else if (cmd.type === 'settings') {
        saveSettings(cmd.patch);
        if(cmd.patch.cameraAuto===true||cmd.patch.cameraDriftEnabled===true||cmd.patch.cameraGiftFocusEnabled===true)sources.current.cameraDirector.resume(Date.now());
      } else if(cmd.type==='weather'){
        sources.current.weather(cmd.preset);
      } else if (cmd.type === 'disconnect') {
        if (sources.mode !== 'demo') { reply({ ok: false, error: 'Mất kết nối giả lập chỉ dùng trong DEMO.' }); return; }
        sources.disconnectDemo();
      } else if (cmd.type === 'retry') {
        if (sources.mode === 'demo') sources.reconnectDemo();
      } else if (cmd.type === 'source') await sources.switchTo(cmd.mode);
      else if (cmd.type === 'live-connect') { saveSettings({ tiktokUsername: cmd.username }); await sources.connectLive(cmd.username); }
      else if (cmd.type === 'live-disconnect') await sources.tiktok.disconnect();
      else if (cmd.type === 'live-retry') {
        if (sources.mode !== 'tiktok') { reply({ ok: false, error: 'Chọn TIKTOK LIVE trước khi thử lại.' }); return; }
        await sources.tiktok.retry();
      }
      reply({ ok: true });
    } catch (error) {
      const message = error instanceof Error && !('code' in error) ? cleanText(error.message, 180) : 'Không lưu được cài đặt. Kiểm tra quyền ghi thư mục data.';
      reply({ ok: false, error: message });
    } finally { if (controlsSource) sourceOperation = false; }
  });
  socket.on('disconnect', () => { telemetry.delete(socket.id);cameraLowFrames.delete(socket.id); if(audioOwner===socket.id) audioOwner=undefined; });
});
app.post('/api/voice32', express.json({limit:'1kb'}), async (req,res) => {
  if(!allowedOrigin(req.get('origin') || undefined)){res.status(403).json({error:'origin'});return;}
  const {sessionId,eventKey}=req.body && typeof req.body==='object' ? req.body : {};
  if(typeof sessionId!=='string'||typeof eventKey!=='string'||sessionId.length>180||eventKey.length>250){res.status(400).json({error:'invalid'});return;}
  const result=await dynamicVoice32.get(sessionId,eventKey,sources.snapshot().sessionId);
  if(!result){res.status(503).json({error:'no-voice'});return;}
  res.setHeader('Cache-Control','no-store');res.json(result);
});
app.get('/api/voice32/status',(_req,res)=>res.json({enabled:dynamicVoice32.enabled, ...dynamicVoice32.status()}));
app.get('/api/audio/status',(_req,res)=>{
  const owner=audioOwner?io.sockets.sockets.get(audioOwner):undefined;
  const surface=owner?.handshake.auth.surface;
  res.setHeader('Cache-Control','no-store');
  res.json({claimed:Boolean(owner),surface:owner?(['capture','preview','browser'].includes(surface)?surface:'browser'):null,
    masterMute:sources.current.settings.masterMute,thanks:{enabled:dynamicVoice32.enabled,...dynamicVoice32.status()},fortune:{enabled:fortuneVoice.enabled,...fortuneVoice.status()},lantern:{enabled:lanternVoice.enabled,...lanternVoice.status()}});
});
app.get('/api/fortune-voice/status',(_req,res)=>res.json({enabled:fortuneVoice.enabled,...fortuneVoice.status()}));
app.post('/api/fortune-voice',express.json({limit:'1kb'}),async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(!allowedOrigin(req.get('origin')||undefined)){res.status(403).json({error:'origin'});return;}
  const parsed=fortuneVoiceRequestSchema.safeParse(req.body);
  if(!parsed.success){res.status(400).json({error:'invalid'});return;}
  const matches=(s:SceneState)=>s.fortune?.sessionId===parsed.data.sessionId&&s.fortune?.revealId===parsed.data.revealId;
  const audible=(s:SceneState)=>Boolean(audioOwner)&&s.settings.fortuneEnabled&&s.settings.fortuneVoiceEnabled&&!s.settings.masterMute&&s.settings.fortuneVolume>0;
  const state=sources.snapshot();
  if(!matches(state)){res.status(404).json({error:'unknown-reveal'});return;}
  if(!fortuneVoice.enabled){res.status(503).json({error:'tts-disabled'});return;}
  if(!audible(state)||(state.ritual&&state.ritual.source!=='comment')){res.status(409).json({error:'audio-disabled-or-gift-priority'});return;}
  const pcm=await fortuneVoice.get(state.fortune!);
  const current=sources.snapshot();
  if(!matches(current)||!audible(current)||(current.ritual&&current.ritual.source!=='comment')){res.status(410).json({error:'expired-or-interrupted'});return;}
  if(!pcm){res.status(503).json({error:'tts-unavailable'});return;}
  res.json(pcm);
});
app.get('/api/health', (_req, res) => res.json({ ok: true, mode: sources.mode.toUpperCase(), actors: sources.current.actors.size, queue: sources.current.waiting.size, fixture: Boolean(options.fixture) }));
app.get('/api/lantern-voice/status',(_req,res)=>res.json({enabled:lanternVoice.enabled,...lanternVoice.status()}));
app.post('/api/lantern-voice',express.json({limit:'1kb'}),async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(!allowedOrigin(req.get('origin')||undefined)){res.status(403).json({error:'origin'});return;}
  const parsed=fortuneVoiceRequestSchema.safeParse(req.body);
  if(!parsed.success){res.status(400).json({error:'invalid'});return;}
  const matches=(s:SceneState)=>s.lantern?.sessionId===parsed.data.sessionId&&s.lantern?.revealId===parsed.data.revealId&&s.serverTime<s.lantern.expiresAt;
  const audible=(s:SceneState)=>Boolean(audioOwner)&&s.settings.lanternEnabled&&s.settings.lanternVoiceEnabled&&!s.settings.masterMute&&s.settings.lanternVolume>0;
  const state=sources.snapshot();
  if(!matches(state)){res.status(404).json({error:'unknown-reveal'});return;}
  if(!lanternVoice.enabled){res.status(503).json({error:'tts-disabled'});return;}
  if(!audible(state)||(state.ritual&&state.ritual.source!=='comment')){res.status(409).json({error:'audio-disabled-or-gift-priority'});return;}
  const pcm=await lanternVoice.get(state.lantern!);
  const current=sources.snapshot();
  if(!matches(current)||!audible(current)||(current.ritual&&current.ritual.source!=='comment')){res.status(410).json({error:'expired-or-interrupted'});return;}
  if(!pcm){res.status(503).json({error:'tts-unavailable'});return;}
  res.json(pcm);
});
app.get('/', (_req, res) => res.redirect('/dashboard/'));
app.get(['/overlay', '/dashboard'], (req, res, next) => {
  if (req.path.endsWith('/')) { next(); return; }
  const query=req.originalUrl.slice(req.path.length);res.redirect(`${req.path}/${query}`);
});
const devServers: { close(): Promise<void> }[] = [];
if (existsSync(resolve(buildDirectory, 'dashboard/index.html')) && (options.serveBuilt || process.argv[1]?.endsWith('server.mjs'))) {
  app.use('/dashboard', express.static(resolve(buildDirectory, 'dashboard'))); app.use('/overlay', express.static(resolve(buildDirectory, 'overlay')));
} else {
  const { createServer: createVite } = await import('vite');
  for (const name of ['dashboard', 'overlay']) {
    const vite = await createVite({ configFile: resolve(`apps/${name}/vite.config.ts`), server: { middlewareMode: true, hmr: { server: http, path: `/${name}-hmr` }, fs: { allow: [process.cwd()] } }, appType: 'spa' });
    devServers.push(vite); app.use((req, res, next) => req.url?.startsWith(`/${name}/`) ? vite.middlewares(req, res, next) : next());
  }
}
const timer = setInterval(() => {
  const engine = sources.current;
  engine.tick();
  const active = [...telemetry.values()].filter(t => Date.now() - t.at < 6000);
  engine.metrics.overlayCount = active.length;
    engine.metrics.cameraDisplays=active.flatMap(t=>t.camera?[t.camera]:[]);
    for(const display of engine.metrics.cameraDisplays)for(const view of Object.keys(display.errors))engine.cameraDirector.resourceFailure(view as import('@vuonsen/shared').CameraView);
  engine.metrics.fps = active.length ? Math.round(active.reduce((n, t) => n + t.fps, 0) / active.length) : 0;
  engine.metrics.quality = active[0]?.quality || 'Chờ overlay';
  engine.revision++;
  const state = sources.snapshot();
  if(dynamicVoice32.enabled) for(const action of engine.actions)
    if(action.type==='GIFT_CONFIRMED' && action.confirmedGift)dynamicVoice32.remember(state.sessionId, action.confirmedGift);
  if (state.sessionId !== previous.sessionId) io.emit('snapshot', state);
  else {
    const old = new Map(previous.actors.map(a => [a.key, JSON.stringify(a)]));
    const keys = new Set(state.actors.map(a => a.key));
    const { actors, ...rest } = state;
    const delta: SceneDelta = { ...rest, upserts: actors.filter(a => old.get(a.key) !== JSON.stringify(a)), removed: previous.actors.filter(a => !keys.has(a.key)).map(a => a.key), actions: engine.actions };
    io.emit('delta', delta);
  }
  engine.actions = []; previous = state;
}, 100);
async function shutdown() { clearInterval(timer); await sources.shutdown(); await Promise.all(devServers.map(v => v.close())); await new Promise<void>(done => io.close(() => done())); if (http.listening) await new Promise<void>(done => http.close(() => done())); }
try { await new Promise<void>((done, reject) => { http.once('error', reject); http.listen(port, '127.0.0.1', () => { http.off('error', reject); done(); }); }); }
catch (error) { await shutdown(); throw error; }
console.log(`Vườn Sen · khởi động DEMO${options.fixture ? ' · FIXTURE TEST (không phải LIVE thật)' : ''}\nDashboard: http://localhost:${port}/dashboard/\nOverlay:   http://localhost:${port}/overlay/\nChỉ lắng nghe 127.0.0.1 · Ctrl+C để dừng`);
return { shutdown, io, sources, http };
}
