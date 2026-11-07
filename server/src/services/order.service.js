import { Order } from "../models/Order.js";
import { Counter } from "../models/Counter.js";
// Never lower an existing counter, including during concurrent startup/seed.
export async function raiseCounter(floor = 1000) {
  try {
    await Counter.updateOne(
      { _id: "orders" },
      { $max: { seq: floor } },
      { upsert: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    await Counter.updateOne({ _id: "orders" }, { $max: { seq: floor } });
  }
}
export async function initializeStorage() {
  await Promise.all([Order.createIndexes(), Counter.init()]);
  const highest = await Order.findOne().sort({ id: -1 }).select("id").lean();
  await raiseCounter(Math.max(1000, highest?.id || 0));
}

export async function createOrder(values) {
  const counter = await Counter.findOneAndUpdate(
    { _id: "orders", seq: { $lt: Number.MAX_SAFE_INTEGER } },
    { $inc: { seq: 1 } },
    { returnDocument: "after" },
  );
  if (!counter) throw new Error("Counter unavailable or exhausted");
  return Order.create({ ...values, id: counter.seq });
}
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export function orderFilter({ search, status }) {
  const filter = status ? { status } : {};
  if (search) {
    const literal = escapeRegex(search);
    filter.$or = ["customerName", "deviceName", "phone"].map((field) => ({
      [field]: { $regex: literal, $options: "i" },
    }));
    filter.$or.push({
      $expr: { $regexMatch: { input: { $toString: "$id" }, regex: literal } },
    });
  }
  return filter;
}
