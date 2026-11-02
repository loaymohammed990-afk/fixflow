export function orderDto(order) {
  return Object.fromEntries(['id', 'customerName', 'phone', 'deviceType', 'deviceName', 'serialNumber', 'problem', 'status', 'createdAt', 'updatedAt'].map(key => [key, order[key]]));
}
export function success(res, data, message = 'تمت العملية بنجاح', meta) {
  return res.json({ success: true, message, data, ...(meta ? { meta } : {}) });
}
