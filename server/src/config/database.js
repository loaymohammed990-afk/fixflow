import mongoose from 'mongoose';
import { initializeStorage } from '../services/order.service.js';
export async function connectDatabase(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000, socketTimeoutMS: 5000 });
  await initializeStorage();
}
