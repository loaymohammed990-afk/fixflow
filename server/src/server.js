import mongoose from 'mongoose';
import { createApp } from './app.js';
import { config } from './config/env.js';
import { connectDatabase } from './config/database.js';
try {
  await connectDatabase(config.uri);
  const server = createApp().listen(config.port, config.host, () => console.log(`FixFlow API: http://${config.host}:${config.port}`));
  server.on('error', async () => { console.error('Unable to listen on API port.'); await mongoose.disconnect(); process.exitCode = 1; });
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    const timer = setTimeout(() => process.exit(1), 8000); timer.unref();
    server.close(async () => { await mongoose.disconnect(); clearTimeout(timer); });
  };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
} catch {
  console.error('تعذر بدء API. تحقق من تشغيل MongoDB وإعدادات server/.env.');
  await mongoose.disconnect(); process.exitCode = 1;
}
