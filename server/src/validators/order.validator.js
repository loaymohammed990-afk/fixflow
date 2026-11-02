import { z } from 'zod';
import { ORDER_STATUSES } from '../models/Order.js';
import { ApiError } from '../middleware/errorHandler.js';
export const normalizeDigits = value => value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
const text = max => z.string({ error: 'أدخل نصًا صحيحًا' }).trim().min(1, 'هذا الحقل مطلوب').max(max, `الحد الأقصى ${max} حرفًا`);
const fields = {
  customerName: text(100),
  phone: z.string().trim().transform(normalizeDigits).pipe(z.string().regex(/^\+?\d{7,15}$/, 'أدخل رقم هاتف صحيحًا من 7 إلى 15 رقمًا')),
  deviceType: z.enum(['جوال', 'لابتوب'], { error: 'اختر نوع الجهاز' }),
  deviceName: text(100),
  serialNumber: z.string().trim().max(100).optional(),
  problem: text(2000),
};
export const createSchema = z.strictObject(fields);
export const updateSchema = createSchema.partial().refine(v => Object.keys(v).length > 0, 'أرسل حقلًا واحدًا على الأقل');
export const statusSchema = z.strictObject({ status: z.enum(ORDER_STATUSES, { error: 'حالة الطلب غير صالحة' }) });
const positive = max => z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().positive().max(max));
export const querySchema = z.strictObject({
  search: z.string().trim().max(100).transform(normalizeDigits).default(''),
  status: z.union([z.literal(''), z.enum(ORDER_STATUSES)]).default(''),
  page: positive(Number.MAX_SAFE_INTEGER).default(1), limit: positive(100).default(10),
}).refine(v => Number.isSafeInteger((v.page - 1) * v.limit), 'رقم الصفحة كبير جدًا');
export function parse(schema, value, query = false) {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(query ? 400 : 422, query ? 'INVALID_QUERY' : 'VALIDATION_ERROR', 'يرجى تصحيح البيانات المدخلة', result.error.issues.flatMap(issue =>
    issue.code === 'unrecognized_keys' ? issue.keys.map(field => ({ field, message: 'حقل غير مسموح' })) : [{ field: issue.path.join('.'), message: issue.message }]));
  return result.data;
}
export function parseId(value) {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new ApiError(400, 'INVALID_ORDER_ID', 'رقم الطلب غير صالح');
  return Number(value);
}
