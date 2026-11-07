import { Router } from 'express';
import mongoose from 'mongoose';
import { audit } from '../models/AuditLog.js';
import { User, userDto } from '../models/User.js';
import { ApiError } from '../middleware/errorHandler.js';
import { unauthenticated } from '../middleware/session.js';
import { hashPassword, temporaryPassword } from '../services/password.service.js';
import { success } from '../utils/orderDto.js';
import { parse } from '../validators/order.validator.js';
import { createUserSchema, updateUserSchema } from '../validators/user.validator.js';

export const users = Router();
const activeAdmin = { role: 'admin', isActive: true };

function userId(req) {
  const { id } = req.params;
  if (!/^[a-f\d]{24}$/i.test(id)) throw new ApiError(400, 'INVALID_USER_ID', 'معرّف المستخدم غير صالح');
  return id;
}

function requireUser(user) {
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'المستخدم غير موجود');
  return user;
}

users.get('/', async (req, res) => {
  success(res, (await User.find().sort({ name: 1, _id: 1 }).lean()).map(userDto));
});

users.post('/', async (req, res) => {
  const values = parse(createUserSchema, req.body);
  if (await User.exists({ email: values.email })) {
    throw new ApiError(409, 'DUPLICATE_EMAIL', 'البريد الإلكتروني مستخدم بالفعل');
  }
  const password = temporaryPassword();
  const user = await User.create({ ...values, passwordHash: await hashPassword(password), mustChangePassword: true });
  await audit('user_created', { actorId: req.user._id, userId: user._id });
  success(res.status(201), { user: userDto(user), temporaryPassword: password }, 'تم إنشاء المستخدم');
});

users.patch('/:id', async (req, res) => {
  const id = userId(req);
  const values = parse(updateUserSchema, req.body);
  // A MongoDB mutex also serializes requests from separate processes on standalone MongoDB.
  const locks = mongoose.connection.collection('authLocks');
  const lock = { _id: 'admin-membership', owner: new mongoose.Types.ObjectId(), createdAt: new Date() };
  try {
    await locks.insertOne(lock);
  } catch (error) {
    if (error.code !== 11000) throw error;
    throw new ApiError(409, 'USER_UPDATE_IN_PROGRESS', 'هناك تعديل آخر للحسابات. حاول مجددًا');
  }

  let user;
  let updated;
  try {
    const actor = await User.exists({ _id: req.user._id, sessionVersion: req.user.sessionVersion, ...activeAdmin });
    if (!actor) throw unauthenticated();
    user = requireUser(await User.findById(id));
    const roleChanged = values.role !== undefined && values.role !== user.role;
    const activeChanged = values.isActive !== undefined && values.isActive !== user.isActive;
    const removesAdmin = user.role === 'admin' && user.isActive &&
      (values.role === 'staff' || values.isActive === false);
    if (removesAdmin && !await User.exists({ ...activeAdmin, _id: { $ne: user._id } })) {
      throw new ApiError(409, 'LAST_ADMIN', 'يجب أن يبقى حساب مدير نشط واحد على الأقل');
    }
    updated = roleChanged || activeChanged
      ? await User.findByIdAndUpdate(id, { $set: values, $inc: { sessionVersion: 1 } }, { returnDocument: 'after', runValidators: true })
      : user;
  } finally {
    await locks.deleteOne({ _id: lock._id, owner: lock.owner });
  }
  const details = { actorId: req.user._id, userId: user._id };
  if (updated.role !== user.role) await audit('user_role_changed', details);
  if (updated.isActive !== user.isActive) await audit(updated.isActive ? 'user_enabled' : 'user_disabled', details);
  success(res, { user: userDto(updated) }, 'تم تحديث المستخدم');
});

users.post('/:id/reset-password', async (req, res) => {
  const id = userId(req);
  const password = temporaryPassword();
  const user = requireUser(await User.findByIdAndUpdate(id, {
    $set: { passwordHash: await hashPassword(password), mustChangePassword: true },
    $inc: { sessionVersion: 1 },
  }, { returnDocument: 'after' }));
  await audit('password_reset', { actorId: req.user._id, userId: user._id });
  success(res, { user: userDto(user), temporaryPassword: password }, 'تمت إعادة ضبط كلمة المرور');
});
