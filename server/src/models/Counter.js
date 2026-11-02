import mongoose from 'mongoose';
export const Counter = mongoose.model('Counter', new mongoose.Schema({
  _id: String,
  seq: { type: Number, required: true },
}, { versionKey: false, bufferCommands: false }));
