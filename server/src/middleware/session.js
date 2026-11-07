import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { User } from '../models/User.js';
import { ApiError } from './errorHandler.js';

const cookieName = 'fixflow.sid';
const cookieOptions = { httpOnly: true, sameSite: 'lax', path: '/' };
const newToken = () => randomBytes(32).toString('hex');
const sessionAction = (req, action) => new Promise((resolve, reject) => {
  req.session[action](error => error ? reject(error) : resolve());
});

export function sessionMiddleware(settings) {
  let client;
  let middleware;
  return (req, res, next) => {
    const currentClient = mongoose.connection.getClient();
    if (client !== currentClient) {
      client = currentClient;
      const store = MongoStore.create({ client, ttl: settings.idleMs / 1000 });
      middleware = session({
        name: cookieName,
        secret: settings.secret,
        store,
        rolling: true,
        resave: false,
        saveUninitialized: false,
        cookie: { ...cookieOptions, secure: settings.secure, maxAge: settings.idleMs },
      });
    }
    req.sessionSettings = settings;
    middleware(req, res, next);
  };
}

export async function startSession(req, user) {
  await sessionAction(req, 'regenerate');
  req.session.userId = String(user._id);
  req.session.sessionVersion = user.sessionVersion;
  req.session.startedAt = Date.now();
  req.session.csrfToken = newToken();
  await sessionAction(req, 'save');
  return req.session.csrfToken;
}

export async function endSession(req, res) {
  await sessionAction(req, 'destroy');
  res.clearCookie(cookieName, { ...cookieOptions, secure: req.sessionSettings.secure });
}

export async function issueCsrfToken(req) {
  if (req.session.userId && remainingLifetime(req) <= 0) {
    await sessionAction(req, 'regenerate');
  }
  if (!req.session.csrfToken) {
    req.session.csrfToken = newToken();
    await sessionAction(req, 'save');
  }
  return req.session.csrfToken;
}

export function requireCsrf(allowedOrigins) {
  return (req, res, next) => {
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return next();
    const origin = req.get('Origin');
    const supplied = req.get('X-CSRF-Token');
    const expected = req.session.csrfToken;
    if ((origin && !allowedOrigins.includes(origin)) || !expected ||
        !/^[a-f0-9]{64}$/.test(supplied ?? '') ||
        !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
      throw new ApiError(403, 'INVALID_CSRF', 'تعذر التحقق من أمان الطلب. أعد المحاولة.');
    }
    next();
  };
}

export const unauthenticated = () => new ApiError(401, 'UNAUTHENTICATED', 'يرجى تسجيل الدخول');
export const forbidden = () => new ApiError(403, 'FORBIDDEN', 'ليست لديك صلاحية');

function remainingLifetime(req) {
  return req.session.startedAt + req.sessionSettings.absoluteMs - Date.now();
}

export async function requireAuth(req, res, next) {
  const { userId, sessionVersion } = req.session;
  if (!userId) throw unauthenticated();
  const remaining = remainingLifetime(req);
  const user = remaining > 0 && await User.findOne({ _id: userId, isActive: true, sessionVersion })
    .select('+sessionVersion');
  if (!user) {
    await endSession(req, res);
    throw unauthenticated();
  }
  req.session.cookie.originalMaxAge = Math.min(req.sessionSettings.idleMs, remaining);
  req.user = user;
  next();
}

export function requirePasswordChanged(req, res, next) {
  if (req.user.mustChangePassword) {
    throw new ApiError(403, 'PASSWORD_CHANGE_REQUIRED', 'غيّر كلمة المرور أولًا');
  }
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) throw forbidden();
    next();
  };
}
