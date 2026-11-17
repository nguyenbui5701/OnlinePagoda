import { startServer } from '../../apps/server/src/app';
import { FakeConnector, ROOM } from './tiktok';

// Test-only server: this module is never imported or bundled by the production entry.
const port = Number(process.env.FIXTURE_PORT || 3107);
const dataDirectory = process.env.FIXTURE_DATA_DIRECTORY!;
if (!dataDirectory?.includes('test-results')) throw new Error('Fixture server requires an isolated test-results directory');
const instances: FakeConnector[] = [];
const factory = (username: string) => {
  if (!username.startsWith('fixture_')) throw new Error('Only synthetic fixture channels accepted');
  const behavior = username === 'fixture_offline' ? { error: { name: 'UserOfflineError' } }
    : username === 'fixture_signing' ? { error: { statusCode: 403 } }
    : username === 'fixture_rate' ? { error: { name: 'SignatureRateLimitError', retryAfter: 120000 } }
    : username === 'fixture_slow' ? 'pending' as const : 'success' as const;
  const connector = new FakeConnector(behavior, username === 'fixture_other' ? '7555555555555555555' : ROOM);
  instances.push(connector);return connector;
};
let server: Awaited<ReturnType<typeof startServer>>;
async function boot() {
  // Audible sine fixture tests the mixer, never represents actual Vietnamese TTS.
  const fortuneSynth=process.env.FORTUNE_VOICE_FIXTURE==='1'?async()=>{
    const seconds=Math.max(1,Math.min(12,Number(process.env.FORTUNE_VOICE_FIXTURE_SECONDS)||4));
    const pcm=Buffer.alloc(24000*2*seconds);
    for(let i=0;i<pcm.length/2;i++)pcm.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/24000)*8000),i*2);
    return {sampleRate:24000 as const,channels:1 as const,pcm16:pcm.toString('base64')};
  }:undefined;
  server = await startServer({ port, dataDirectory, connectorFactory: factory, fixture: true, serveBuilt: process.env.FIXTURE_SERVE_SOURCE!=='1', fortuneSynth });
  server.io.on('connection', socket => {
    socket.on('fixture', (request, ack) => {
      if (request?.operation === 'inspect') { ack({ok:true,created:instances.length,active:instances.filter(c=>c.connected&&!c.disconnected).length});return; }
      if (request?.operation === 'restart') { ack({ok:true});setTimeout(()=>{void server.shutdown().then(boot);},100);return; }
      const connector = instances.at(-1);
      if (!connector) { ack({ok:false});return; }
      if (request?.event === 'resolve') connector.resolve();
      else connector.emit(request.event, request.payload);
      ack({ok:true});
    });
  });
}
await boot();
process.on('message', message => { if (message === 'shutdown') void server.shutdown().then(()=>process.exit(0)); });
process.on('disconnect', () => { void server.shutdown().then(()=>process.exit(0)); });
