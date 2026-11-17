import { chromium } from 'playwright';
import { io } from 'socket.io-client';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const url = 'http://127.0.0.1:3108';
assert.equal((await (await fetch(`${url}/api/health`)).json()).fixture, true, 'Isolated fixture required');
const out = 'artifacts/stage3/baseline'; await mkdir(out, { recursive: true });
const socket = io(url, { auth: { role: 'dashboard' } });
await new Promise(done => socket.once('connect', done));
const command = cmd => new Promise((done, reject) => socket.timeout(5000).emit('command', cmd, (error, reply) => error ? reject(error) : reply.ok ? done() : reject(Error(reply.error))));
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await command({ type: 'reset' }); await page.goto(`${url}/overlay/`);
  await page.waitForFunction(() => window.__sceneDebug?.actors === 0);
  await page.screenshot({ path: `${out}/overlay-0.png` });
  await command({ type: 'add', count: 10 });
  await page.waitForFunction(() => window.__sceneDebug?.actors === 10 && window.__sceneDebug.states.every(s => s === 'idle'));
  await page.screenshot({ path: `${out}/overlay-10.png` });
  await command({ type: 'add', count: 100 });
  await page.waitForFunction(() => window.__sceneDebug?.actors === 60 && window.__sceneDebug.states.every(s => s === 'idle'));
  await page.screenshot({ path: `${out}/overlay-60.png` });
  await page.setViewportSize({ width: 1440, height: 1100 }); await page.goto(`${url}/dashboard/`);
  await page.getByTestId('actors').filter({ hasText: '60' }).waitFor();
  await page.screenshot({ path: `${out}/dashboard.png`, fullPage: true });
  console.log('Baseline captured on isolated fixture port 3108; production untouched.');
} finally { socket.disconnect(); await browser.close(); }
