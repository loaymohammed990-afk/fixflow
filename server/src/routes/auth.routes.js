import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { audit } from '../models/AuditLog.js';
import { User, userDto } from '../models/User.js';
import { ApiError } from '../middleware/errorHandler.js';
import { endSession, issueCsrfToken, requireAuth, startSession, unauthenticated } from '../middleware/session.js';
import { hashPassword, temporaryPassword, verifyPassword } from '../services/password.service.js';
import { success } from '../utils/orderDto.js';
import { parse } from '../validators/order.validator.js';
import { changePasswordSchema, loginSchema } from '../validators/user.validator.js';

export function authRoutes(csrf) {
  const auth = Router();
  let dummyHash;
  const loginLimit = rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: async (req, res, next) => {
      await audit('login_failed');
      next(new ApiError(429, 'TOO_MANY_ATTEMPTS', 'محاولات كثيرة، حاول مجددًا لاحقًا'));
    },
  });

  auth.get('/csrf', async (req, res) => success(res, { csrfToken: await issueCsrfToken(req) }));
  auth.post('/login', loginLimit, csrf, async (req, res) => {
    const invalid = () => new ApiError(401, 'INVALID_CREDENTIALS', 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      await audit('login_failed');
      throw invalid();
    }
    const { email, password } = result.data;
    const user = await User.findOne({ email }).select('+passwordHash +sessionVersion');
    const fallback = await (dummyHash ??= hashPassword(temporaryPassword()));
    const valid = await verifyPassword(user?.passwordHash ?? fallback, password);
    const current = valid && user?.isActive && await User.findOneAndUpdate(
      { _id: user._id, isActive: true, sessionVersion: user.sessionVersion },
      { $set: { lastLoginAt: new Date() } },
      { returnDocument: 'after' },
    ).select('+sessionVersion');
    if (!current) {
      await audit('login_failed', { userId: user?._id });
      throw invalid();
    }
    const csrfToken = await startSession(req, current);
    await audit('login_succeeded', { actorId: current._id });
    success(res, { user: userDto(current), csrfToken }, 'تم تسجيل الدخول بنجاح');
  });

  auth.get('/me', requireAuth, (req, res) => success(res, { user: userDto(req.user) }));
  auth.post('/logout', csrf, async (req, res) => {
    await endSession(req, res);
    success(res, null, 'تم تسجيل الخروج');
  });
  auth.post('/change-password', requireAuth, csrf, async (req, res) => {
    const { currentPassword, newPassword } = parse(changePasswordSchema, req.body);
    const filter = { _id: req.user._id, isActive: true, sessionVersion: req.user.sessionVersion };
    const user = await User.findOne(filter).select('+passwordHash');
    if (!user) throw unauthenticated();
    if (!await verifyPassword(user.passwordHash, currentPassword)) {
      throw new ApiError(422, 'INVALID_CURRENT_PASSWORD', 'كلمة المرور الحالية غير صحيحة');
    }
    if (currentPassword === newPassword) {
      throw new ApiError(422, 'PASSWORD_UNCHANGED', 'اختر كلمة مرور مختلفة عن الحالية');
    }
    const passwordHash = await hashPassword(newPassword);
    const result = await User.updateOne(filter, {
      $set: { passwordHash, mustChangePassword: false },
      $inc: { sessionVersion: 1 },
    });
    if (!result.matchedCount) throw unauthenticated();
    await audit('password_changed', { actorId: user._id });
    await endSession(req, res);
    success(res, null, 'تم تغيير كلمة المرور. يرجى تسجيل الدخول مجددًا');
  });
  return auth;
}
