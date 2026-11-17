import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';
import { usernameSchema } from '@vuonsen/shared';
import { classifyLiveError } from './errors';
import { selectWireFields, type WebcastType } from './mapper';
import { connectorOptions } from './options';

// Standalone Node child; no stdout/stderr/raw event logging. Parent owns retries and cancellation.
let connection: TikTokLiveConnection | undefined;
let inFlight = 0, dropped = 0;
function send(message: unknown) {
  if (!process.connected || !process.send) return;
  if (inFlight >= 256) { dropped++; return; }
  inFlight++;
  process.send(message as any, () => { inFlight--; });
}
const metricTimer = setInterval(() => { if (dropped) { const count = dropped; dropped = 0; send({ type: 'dropped', count }); } }, 1000);
const eventMap: [WebcastType, WebcastEvent][] = [ ['chat', WebcastEvent.CHAT], ['member', WebcastEvent.MEMBER], ['gift', WebcastEvent.GIFT], ['like', WebcastEvent.LIKE], ['roomUser', WebcastEvent.ROOM_USER] ];
process.on('message', (message: any) => {
  if (message?.type !== 'connect' || connection) return;
  const parsed = usernameSchema.safeParse(message.username);
  if (!parsed.success) { send({ type: 'fault', fault: classifyLiveError(null) }); return; }
  try {
    connection = new TikTokLiveConnection(parsed.data, connectorOptions);
    connection.on(ControlEvent.ERROR, error => send({ type: 'fault', fault: classifyLiveError(error) }));
    connection.on(ControlEvent.CONNECTED, state => send({ type: 'connected', roomId: state.roomId }));
    connection.on(ControlEvent.DISCONNECTED, () => send({ type: 'event', event: 'disconnected', payload: { code: 1006 } }));
    connection.on(WebcastEvent.STREAM_END, () => send({ type: 'event', event: 'streamEnd', payload: {} }));
    for (const [name, event] of eventMap) connection.on(event as WebcastEvent.CHAT, raw => {
      try { send({ type: 'event', event: name, payload: selectWireFields(name, raw) }); }
      catch { dropped++; }
    });
    void connection.connect().catch(error => send({ type: 'fault', fault: classifyLiveError(error) }));
  } catch (error) { send({ type: 'fault', fault: classifyLiveError(error) }); }
});
process.on('disconnect', () => { clearInterval(metricTimer); process.exit(0); });
process.on('SIGTERM', () => { clearInterval(metricTimer); void connection?.disconnect().finally(() => process.exit(0)); });
