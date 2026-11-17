const { app, BrowserWindow, screen, Menu } = require('electron');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve, join } = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const executeFile = promisify(execFile);
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid PORT');
const check = process.argv.includes('--check');
const url = `http://127.0.0.1:${port}/overlay/?capture=1${check ? '' : '&sound'}`;
const title = 'Vườn Sen · Capture dọc';
// Capture pixels should match physical display pixels, irrespective of Windows UI scaling.
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.setPath('userData', resolve('test-results/capture-runtime'));
app.setName('Vuon Sen Capture');
app.on('window-all-closed', () => app.quit());
let window;
const sleep = ms => new Promise(done => setTimeout(done, ms));
function fit() {
  const display = window ? screen.getDisplayMatching(window.getBounds()) : screen.getPrimaryDisplay();
  const { x, y, width, height } = display.workArea;
  const unit = Math.max(1, Math.floor(Math.min((width - 16) / 9, (height - 16) / 16)));
  const bounds = { x: x + 8, y: y + 8, width: 9 * unit, height: 16 * unit };
  window?.setBounds(bounds);
  return bounds;
}
async function main() {
  await app.whenReady(); Menu.setApplicationMenu(null);
  window = new BrowserWindow({
    ...fit(), title, show: false, frame: false, thickFrame: false, roundedCorners: false,
    hasShadow: false, useContentSize: true, resizable: false, maximizable: false,
    fullscreenable: false, autoHideMenuBar: true, backgroundColor: '#17392f',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true,
      backgroundThrottling: false, partition: 'vuonsen-capture', devTools: false }
  });
  window.setMenu(null);
  const web = window.webContents;
  // A local, read-only overlay. No Node bridge, preload, account access or server commands.
  web.setWindowOpenHandler(() => ({ action: 'deny' }));
  web.on('will-navigate', (event, target) => { if (target !== url) event.preventDefault(); });
  web.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  web.on('page-title-updated', event => { event.preventDefault(); window.setTitle(title); });
  web.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.control && input.shift && input.code === 'Digit9') { event.preventDefault(); fit(); }
    if (input.type === 'keyDown' && input.alt && input.key === 'F4') { event.preventDefault(); window.close(); }
  });
  web.on('did-finish-load', () => {
    // Drag anywhere in this read-only scene to move the frameless window.
    void web.insertCSS('html,body,#scene,canvas{-webkit-app-region:drag}');
    window.setTitle(title);
  });
  await window.loadURL(url); window.show();
  console.log('Đã mở cửa sổ Vườn Sen · Capture dọc: không thanh tiêu đề, không viền, đúng 9:16.');
  console.log('LIVE Studio → Window capture → chọn Vườn Sen · Capture dọc (electron.exe).');
  console.log('Kéo nguồn phủ kín khung LIVE. Kéo hình để di chuyển cửa sổ; Ctrl+Shift+9 căn lại; Alt+F4 đóng.');
  if (!check) return;
  const outDir = process.env.CAPTURE_ARTIFACT_DIR || 'artifacts/capture-borderless'; await mkdir(outDir, { recursive: true });
  for (let i = 0; i < 100; i++) {
    if (await web.executeJavaScript('Boolean(window.__sceneDebug)')) break;
    await sleep(100);
  }
  if (process.env.CAPTURE_AUDIO_CHECK === '1') {
    const health = await (await fetch(`http://127.0.0.1:${port}/api/health`)).json();
    if (!health.fixture || health.mode !== 'DEMO') throw new Error('Audio smoke requires isolated DEMO fixture');
    const enabled = await web.executeJavaScript('window.__audioControl.enable()', true);
    if (!enabled) throw new Error('Audio activation failed');
    await web.executeJavaScript("window.__audioControl.test('full','rose')", true);
    for(let i=0;i<65;i++){await sleep(100);await web.executeJavaScript('window.__audioControl.debug()');}
    await web.executeJavaScript("window.__audioControl.test('sfx','donut')", true);
    for(let i=0;i<30;i++){await sleep(100);await web.executeJavaScript('window.__audioControl.debug()');}
    const audio = await web.executeJavaScript('window.__audioControl.debug()');
    await writeFile(join(outDir, 'audio-report.json'), JSON.stringify({kind:'ELECTRON ACTUAL PLAYBACK; see separate WASAPI recording',...audio},null,2));
    if (audio.played < 2 || audio.state !== 'ready' || audio.peak <= .001) throw new Error('Audio smoke failed');
  }
  // Exercise the same shortcut handler used to restore the portrait bounds.
  web.sendInputEvent({ type: 'keyDown', keyCode: '9', modifiers: ['control', 'shift'] });
  web.sendInputEvent({ type: 'keyUp', keyCode: '9', modifiers: ['control', 'shift'] });
  await sleep(500);
  const result = await web.executeJavaScript(`(() => {
    const canvas = document.querySelector('canvas'); const rect = canvas.getBoundingClientRect();
    return { ready: Boolean(window.__sceneDebug), viewport: { width: innerWidth, height: innerHeight },
      canvas: { width: canvas.width, height: canvas.height },
      gutterX: innerWidth - rect.width, gutterY: innerHeight - rect.height,
      overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
      nodeExposed: typeof window.require !== 'undefined' || typeof window.process !== 'undefined' };
  })()`);
  const { stdout } = await executeFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(__dirname, 'inspect-capture-window.ps1'),
    '-BrowserProcessId', String(process.pid), '-ScreenshotPath', resolve(outDir, 'whole-window.png')], { windowsHide: true, timeout: 15000 });
  const native = JSON.parse(stdout.trim());
  const bounds = window.getBounds(), contentBounds = window.getContentBounds();
  const passed = result.ready && Math.abs(result.gutterX) <= 1 && Math.abs(result.gutterY) <= 1 && !result.overflow && !result.nodeExposed
    && result.canvas.width === 1080 && result.canvas.height === 1920
    && bounds.width === contentBounds.width && bounds.height === contentBounds.height
    && !native.hasCaption && native.width === native.clientWidth && native.height === native.clientHeight
    && native.width * 16 === native.height * 9 && result.viewport.width === native.width && result.viewport.height === native.height;
  await writeFile(join(outDir, 'overlay.png'), (await web.capturePage()).toPNG());
  const report = { passed, electron: process.versions.electron, bounds, contentBounds, native, ...result };
  await writeFile(join(outDir, 'check.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  app.exit(passed ? 0 : 1);
}
main().catch(error => { console.error(error); app.exit(1); });
