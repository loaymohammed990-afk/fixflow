import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  event: { type: String, required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orderId: Number,
  status: String,
}, { collection: 'auditLogs', timestamps: { createdAt: true, updatedAt: false }, bufferCommands: false });

const AuditLog = mongoose.model('AuditLog', schema);

export async function audit(event, details) {
  try {
    await AuditLog.create({ event, ...details });
  } catch {
    console.error('Unable to write audit event:', event);
  }
}
