import { Router } from 'express';
import { Order, ORDER_STATUSES } from '../models/Order.js';
import { createOrder, orderFilter } from '../services/order.service.js';
import { createSchema, updateSchema, statusSchema, querySchema, parse, parseId } from '../validators/order.validator.js';
import { ApiError } from '../middleware/errorHandler.js';
import { orderDto, success } from '../utils/orderDto.js';
export const orders = Router();
orders.get('/statuses', (req, res) => success(res, ORDER_STATUSES, 'تم جلب حالات الصيانة'));
orders.get('/', async (req, res) => {
  const query = parse(querySchema, req.query, true);
  const filter = orderFilter(query);
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1, id: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    Order.countDocuments(filter),
  ]);
  success(res, items.map(orderDto), 'تم جلب طلبات الصيانة بنجاح', { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) });
});
orders.post('/', async (req, res) => {
  const order = await createOrder(parse(createSchema, req.body));
  success(res.status(201), orderDto(order), 'تم إنشاء طلب الصيانة بنجاح');
});
function found(order) {
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'الطلب غير موجود');
  return orderDto(order);
}
orders.get('/:id', async (req, res) => success(res, found(await Order.findOne({ id: parseId(req.params.id) }).lean())));
orders.patch('/:id', async (req, res) => {
  const id = parseId(req.params.id), values = parse(updateSchema, req.body);
  success(res, found(await Order.findOneAndUpdate({ id }, { $set: values }, { returnDocument: 'after', runValidators: true })), 'تم حفظ التعديلات');
});
orders.patch('/:id/status', async (req, res) => {
  const id = parseId(req.params.id), values = parse(statusSchema, req.body);
  success(res, found(await Order.findOneAndUpdate({ id }, { $set: values }, { returnDocument: 'after', runValidators: true })), 'تم تحديث حالة الطلب');
});
