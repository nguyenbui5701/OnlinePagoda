import { EventEmitter } from 'node:events';
import { fork, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ConnectorTransport {
  on(event: string, listener: (...args: any[]) => void): this;
  off(event: string, listener: (...args: any[]) => void): this;
  connect(): Promise<{ roomId: string }>;
  disconnect(): Promise<void>;
}
export type ConnectorFactory = (username: string) => ConnectorTransport;

/** Isolate connector I/O so timeout/manual disconnect can cancel even an in-flight signing request. */
export class WorkerConnectorTransport extends EventEmitter implements ConnectorTransport {
  private child?: ChildProcess;
  private connecting?: { resolve: (state: { roomId: string }) => void; reject: (reason: unknown) => void };
  constructor(private username: string) { super(); }
  connect(): Promise<{ roomId: string }> {
    if (this.child) return Promise.reject(new Error('Already connecting'));
    return new Promise((resolveConnect, reject) => {
      this.connecting = { resolve: resolveConnect, reject };
      const built = process.argv[1]?.endsWith('server.mjs');
      const file = resolve(built ? 'dist/tiktok-worker.mjs' : 'apps/server/src/tiktok/worker.ts');
      if (!existsSync(file)) { reject(new Error('Missing connector worker')); return; }
      const child = fork(file, [], { execArgv: built ? [] : ['--import', 'tsx'], windowsHide: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
      this.child = child;
      child.on('message', (message: any) => {
        if (this.child !== child || !message || typeof message !== 'object') return;
        if (message.type === 'connected') { this.connecting?.resolve({ roomId: message.roomId }); this.connecting = undefined; }
        else if (message.type === 'fault') {
          this.connecting?.reject({ safeFault: message.fault }); this.connecting = undefined;
          this.emit('error', { safeFault: message.fault });
        } else if (message.type === 'event') this.emit(message.event, message.payload);
        else if (message.type === 'dropped') this.emit('dropped', message.count);
      });
      child.on('error', () => { this.connecting?.reject({ code: 'ECONNRESET' }); this.connecting = undefined; this.emit('error', { code: 'ECONNRESET' }); });
      child.on('exit', () => {
        if (this.child !== child) return;
        this.child = undefined; this.connecting?.reject({ code: 'ECONNRESET' }); this.connecting = undefined;
        this.emit('disconnected', { code: 1006 });
      });
      child.send({ type: 'connect', username: this.username });
    });
  }
  async disconnect(): Promise<void> {
    const child = this.child; this.child = undefined;
    this.connecting?.reject({ name: 'AbortError' }); this.connecting = undefined;
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    // Killing our dedicated process also cancels its HTTP/SDK/WebSocket handles on Windows.
    await new Promise<void>(resolveExit => { child.once('exit', () => resolveExit()); child.kill(); });
  }
}
