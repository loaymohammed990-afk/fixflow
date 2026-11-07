import { z } from 'zod';
import { ROLES } from '../models/User.js';

const email = z.string().trim().toLowerCase().max(254).pipe(z.email({ error: 'أدخل بريدًا إلكترونيًا صالحًا' }));
const name = z.string().trim().min(1, 'أدخل الاسم').max(100);
const role = z.enum(ROLES);
const suppliedPassword = z.string().min(1).max(1024);
export const newPassword = suppliedPassword.refine(
  value => [...value].length >= 12 && value.trim().length > 0,
  'استخدم كلمة مرور من 12 حرفًا على الأقل',
);
export const loginSchema = z.strictObject({ email, password: suppliedPassword });
export const changePasswordSchema = z.strictObject({ currentPassword: suppliedPassword, newPassword });
export const createUserSchema = z.strictObject({ name, email, role: role.default('staff') });
export const updateUserSchema = z.strictObject({ role: role.optional(), isActive: z.boolean().optional() })
  .refine(value => Object.keys(value).length > 0, 'أرسل الدور أو حالة الحساب');
