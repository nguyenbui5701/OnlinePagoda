import 'dotenv/config';
import { startServer } from './app';
const server = await startServer();
let closing = false;
async function shutdown() { if (closing) return; closing = true; await server.shutdown(); process.exit(0); }
process.on('SIGINT', () => { void shutdown(); });
process.on('SIGTERM', () => { void shutdown(); });
