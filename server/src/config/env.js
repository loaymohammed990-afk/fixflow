import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 4000),
  uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fixflow',
  origins: (process.env.CORS_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173').split(',').map(s => s.trim()),
  development: process.env.NODE_ENV !== 'production',
};
if (!['127.0.0.1', '::1', 'localhost'].includes(config.host)) throw new Error('HOST must be loopback.');
if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error('Invalid PORT.');
