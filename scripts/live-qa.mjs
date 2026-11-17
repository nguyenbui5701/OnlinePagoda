// Opt-in public LIVE observation. Never sends TikTok chat, likes or gifts.
import { io } from 'socket.io-client';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { normalizeUsername } from '../packages/shared/src/live.ts';

const username = normalizeUsername(process.argv[2] || '');
const seconds = Number(process.argv[3] || 90);
if (!username || !Number.isInteger(seconds) || seconds < 15 || seconds > 600) {
  throw new Error('Usage: node scripts/live-qa.mjs @username 90 (15–600 seconds)');
}
const url = process.env.APP_URL || 'http://127.0.0.1:3000';
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Local server required');
const health = await (await fetch(`${url}/api/health`)).json();
if (health.fixture) throw new Error('Refusing to label a fixture server as real LIVE');
const outDir = `artifacts/stage2/live-manual-${Date.now()}`;
await mkdir(outDir, { recursive: true });
const report = { kind: 'REAL CONNECTOR OBSERVATION — manual acceptance required', username, startedAt: new Date().toISOString(), status: [], connectedObserved: false, roomId: null, maxActors: 0, received: {}, actions: {}, manualQA: 'CHƯA XÁC NHẬN', error: null };
const socket = io(url, { auth: { role: 'dashboard' }, reconnection: false });
let state, started = false, browser;
const sleep = ms => new Promise(done => setTimeout(done, ms));
function record(value) {
  state = value;
  const connection = state.connection;
  if (report.status.at(-1)?.status !== connection.status) {
    const summary = { at: new Date().toISOString(), status: connection.status, errorCode: connection.errorCode, message: connection.lastError, retryAt: connection.retryAt };
    report.status.push(summary); console.log(JSON.stringify(summary));
  }
  if (connection.status === 'LIVE_CONNECTED') { report.connectedObserved = true; report.roomId = connection.roomId; }
  if (state.mode === 'tiktok') { report.maxActors = Math.max(report.maxActors, state.actors.length); report.received = connection.received; report.metrics = { newActors: state.metrics.newActors, giftUnits: state.metrics.giftUnits, giftTransactions: state.metrics.giftTransactions, dropped: state.metrics.dropped, reasons: state.metrics.reasons }; }
}
socket.on('snapshot', record);
socket.on('delta', delta => {
  if (!state || state.sessionId !== delta.sessionId || state.revision + 1 !== delta.revision) { socket.emit('resync'); return; }
  const actors = new Map(state.actors.map(a => [a.key, a]));
  delta.removed.forEach(key => actors.delete(key)); delta.upserts.forEach(a => actors.set(a.key, a));
  if (started && delta.mode === 'tiktok') for (const action of delta.actions) report.actions[action.type] = (report.actions[action.type] || 0) + 1;
  record({ ...delta, actors: [...actors.values()] });
});
const command = payload => new Promise((done, reject) => socket.timeout(5000).emit('command', payload, (error, reply) => error ? reject(error) : reply.ok ? done(reply) : reject(new Error(reply.error))));
try {
  for (let i = 0; !state && i < 100; i++) await sleep(100);
  if (!state) throw new Error('No local snapshot');
  if (['LIVE_CONNECTED', 'CONNECTING', 'RECONNECTING', 'RATE_LIMITED'].includes(state.connection.status)) throw new Error('A connection/retry is already active; use dashboard to finish it first');
  await command({ type: 'source', mode: 'tiktok' });
  await command({ type: 'live-connect', username }); started = true;
  const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  browser = await chromium.launch({ headless: true, ...(existsSync(edge) ? { executablePath: edge } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(`${url}/dashboard/`);
  const overlay = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await overlay.goto(`${url}/overlay/`);
  for (let i = 0; i < seconds; i++) {
    await sleep(1000);
    if (['LIVE_OFFLINE', 'ERROR', 'RATE_LIMITED', 'DISCONNECTED'].includes(state.connection.status)) break;
    if (i % 10 === 0) console.log(JSON.stringify({ elapsed: i + 1, received: report.received, actors: report.maxActors, actions: report.actions }));
  }
  await page.screenshot({ path: `${outDir}/dashboard.png`, fullPage: true });
  await overlay.screenshot({ path: `${outDir}/overlay.png` });
} catch (error) {
  report.error = error instanceof Error ? error.message : 'QA failed'; process.exitCode = 1;
} finally {
  if (started && state?.mode === 'tiktok' && state.connection.username === username) await command({ type: 'live-disconnect' }).catch(() => {});
  socket.disconnect(); await browser?.close(); report.endedAt = new Date().toISOString();
  report.note = 'Counts/actions are observed only; two-account identity, prayer visuals, real gifts, network interruption and OBS require individual manual confirmation. No raw chat or viewer IDs stored.';
  await writeFile(`${outDir}/test-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ output: outDir, connectedObserved: report.connectedObserved, received: report.received, manualQA: report.manualQA }));
}
