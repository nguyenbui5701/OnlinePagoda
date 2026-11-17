import 'dotenv/config';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import electron from 'electron';

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT không hợp lệ.');
try {
  const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(3000) });
  if (!response.ok || !(await response.json()).ok) throw new Error('Unavailable');
} catch {
  console.error('Chưa mở được Vườn Sen. Chạy start.bat trước, sau đó mở lại mo-overlay-doc.bat.');
  process.exit(1);
}
const childEnv = { ...process.env, PORT: String(port) };
delete childEnv.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, [fileURLToPath(new URL('./capture-app.cjs', import.meta.url)), ...(process.argv.includes('--check') ? ['--check'] : [])], {
  env: childEnv, stdio: 'inherit', windowsHide: false
});
process.once('SIGINT', () => child.kill()); process.once('SIGTERM', () => child.kill());
process.exitCode = await new Promise(resolveExit => {
  child.once('error', error => { console.error(error.message); resolveExit(1); });
  child.once('exit', code => resolveExit(code ?? 1));
});
