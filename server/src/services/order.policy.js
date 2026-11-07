import { ORDER_STATUSES } from '../models/Order.js';
import { forbidden } from '../middleware/session.js';

export const canceledStatus = ORDER_STATUSES[4];

export function editableOrder(id, user, nextStatus) {
  if (user.role === 'admin') return { id };
  if (nextStatus === canceledStatus) throw forbidden();
  // Apply the policy in the write filter so a concurrent cancellation cannot be bypassed.
  return { id, status: { $ne: canceledStatus } };
}
