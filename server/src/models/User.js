import mongoose from 'mongoose';

export const ROLES = ['admin', 'staff'];
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ROLES, default: 'staff', required: true },
  isActive: { type: Boolean, default: true, required: true },
  mustChangePassword: { type: Boolean, default: false, required: true },
  sessionVersion: { type: Number, default: 0, required: true, select: false },
  lastLoginAt: Date,
}, { timestamps: true, bufferCommands: false });

export const User = mongoose.model('User', schema);

export function userDto(user) {
  const { name, email, role, isActive, mustChangePassword, lastLoginAt } = user;
  return { id: String(user._id), name, email, role, isActive, mustChangePassword, lastLoginAt };
}
