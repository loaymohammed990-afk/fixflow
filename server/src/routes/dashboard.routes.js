import { Router } from 'express';
import { Order, ORDER_STATUSES } from '../models/Order.js';
import { orderDto, success } from '../utils/orderDto.js';
export const dashboard = Router();
dashboard.get('/summary', async (req, res) => {
  const [counts, recent] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.find().sort({ createdAt: -1, id: -1 }).limit(5).lean(),
  ]);
  const byStatus = Object.fromEntries(ORDER_STATUSES.map(status => [status, 0]));
  counts.forEach(({ _id, count }) => { if (_id in byStatus) byStatus[_id] = count; });
  success(res, { totalOrders: counts.reduce((sum, row) => sum + row.count, 0), byStatus, recentOrders: recent.map(orderDto) }, 'تم جلب ملخص لوحة التحكم');
});
