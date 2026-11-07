import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 4000),
  uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fixflow',
  origins: [...(process.env.CORS_ORIGINS ?? (process.env.NODE_ENV === 'production' ? '' : 'http://127.0.0.1:5173,http://localhost:5173')).split(','), process.env.CLIENT_ORIGIN].map(origin => origin?.trim()).filter(Boolean),
  development: process.env.NODE_ENV !== 'production',
};
if (!['127.0.0.1', '::1', 'localhost'].includes(config.host)) throw new Error('HOST must be loopback.');
if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error('Invalid PORT.');

export function sessionConfig() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32 || secret === 'REPLACE_WITH_LONG_RANDOM_SECRET') {
    throw new Error('SESSION_SECRET must be a random secret of at least 32 characters.');
  }
  const idleMinutes = Number(process.env.SESSION_IDLE_MINUTES ?? 30);
  const absoluteHours = Number(process.env.SESSION_ABSOLUTE_HOURS ?? 8);
  if (!Number.isInteger(idleMinutes) || idleMinutes < 1 || idleMinutes > 30 ||
      !Number.isInteger(absoluteHours) || absoluteHours < 1 || absoluteHours > 8) {
    throw new Error('Invalid session idle or absolute lifetime.');
  }
  if (!config.development && process.env.COOKIE_SECURE === 'false') {
    throw new Error('Production requires secure session cookies.');
  }
  return {
    secret,
    idleMs: idleMinutes * 60_000,
    absoluteMs: absoluteHours * 3_600_000,
    secure: !config.development || process.env.COOKIE_SECURE === 'true',
  };
}
