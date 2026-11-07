import mongoose from 'mongoose';
export class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message); Object.assign(this, { status, code, details });
  }
}
export function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState !== 1) return next(new ApiError(503, 'DATABASE_UNAVAILABLE', 'قاعدة البيانات غير متاحة، حاول مجددًا'));
  next();
}
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let safe = error instanceof ApiError ? error : null;
  if (!safe && error.code === 11000 && error.keyPattern?.email) safe = new ApiError(409, 'DUPLICATE_EMAIL', 'البريد الإلكتروني مستخدم بالفعل');
  if (!safe && error.code === 11000) safe = new ApiError(409, 'DUPLICATE_ORDER_ID', 'رقم الطلب موجود بالفعل');
  if (!safe && error.type === 'entity.parse.failed') safe = new ApiError(400, 'VALIDATION_ERROR', 'صيغة JSON غير صالحة');
  if (!safe && error.type === 'entity.too.large') safe = new ApiError(413, 'VALIDATION_ERROR', 'حجم البيانات أكبر من المسموح');
  if (!safe && (mongoose.connection.readyState !== 1 || /Mongo(Network|ServerSelection)|MongooseServerSelection/.test(error.name))) safe = new ApiError(503, 'DATABASE_UNAVAILABLE', 'قاعدة البيانات غير متاحة، حاول مجددًا');
  if (!safe) { console.error('Request failed:', error.name); safe = new ApiError(500, 'INTERNAL_ERROR', 'حدث خطأ داخلي، حاول مجددًا'); }
  res.status(safe.status).json({ success: false, error: { code: safe.code, message: safe.message, details: safe.details } });
}
