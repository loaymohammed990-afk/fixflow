import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { mockOrders } from '../../src/data/mockOrders.js';
import { Order } from '../src/models/Order.js';
import { raiseCounter } from '../src/services/order.service.js';
import { connectDatabase } from '../src/config/database.js';
import { config } from '../src/config/env.js';
export async function seed() {
  // Reserve seed numbers before inserting; live creates cannot allocate them.
  const highest = await Order.findOne().sort({ id: -1 }).select('id').lean();
  await raiseCounter(Math.max(1000, highest?.id || 0, ...mockOrders.map(o => o.id)));
  for (const order of mockOrders) {
    const date = new Date(`${order.createdAt}Z`);
    await Order.updateOne({ id: order.id }, { $setOnInsert: { ...order, createdAt: date, updatedAt: date } }, { upsert: true, timestamps: false, runValidators: true });
  }
  const latest = await Order.findOne().sort({ id: -1 }).select('id').lean();
  await raiseCounter(Math.max(1000, latest?.id || 0));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await connectDatabase(config.uri); await seed(); console.log('Seed complete: existing orders preserved.'); }
  catch { console.error('Seed failed. Check MongoDB and server/.env.'); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
}
