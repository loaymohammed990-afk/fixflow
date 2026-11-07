import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import mongoose from 'mongoose';
import { randomBytes, randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { Order, ORDER_STATUSES } from '../src/models/Order.js';
import { seed } from '../scripts/seed.js';
import { User } from '../src/models/User.js';
import { hashPassword } from '../src/services/password.service.js';

// Explicit opt-in. Always use a new database and retain it; no delete/drop operations.
test('MongoDB HTTP smoke: sessions, permissions, order workflows and persistence', { skip: !process.env.TEST_MONGODB_URI && 'Set TEST_MONGODB_URI to a local MongoDB server to run the isolated smoke test' }, async t => {
  const name = `fixflow_test_${randomUUID().replaceAll('-', '')}`;
  const uri = new URL(process.env.TEST_MONGODB_URI);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(uri.hostname), 'Test DB must be local');
  uri.pathname = `/${name}`;
  await connectDatabase(uri.toString());
  t.after(() => mongoose.disconnect());
  console.log(`Isolated database retained: ${name}`);
  const settings = { secret: randomBytes(32).toString('hex'), idleMs: 1800_000, absoluteMs: 28_800_000, secure: false };
  const server = createApp(settings).listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  let base = `http://127.0.0.1:${server.address().port}/api/v1`;
  function browser() {
    let cookie, token;
    async function call(path, method = 'GET', body, headers = {}) {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: {
          ...(cookie ? { Cookie: cookie } : {}),
          ...(token ? { 'X-CSRF-Token': token } : {}),
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      });
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';')[0];
      const payload = await response.json();
      if (payload.data?.csrfToken) token = payload.data.csrfToken;
      return { status: response.status, setCookie, ...payload };
    }
    async function login(email, password) {
      await call('/auth/csrf');
      return call('/auth/login', 'POST', { email, password });
    }
    return { call, login, get cookie() { return cookie; }, get token() { return token; } };
  }
  const email = 'admin@example.test';
  const password = randomBytes(24).toString('base64url');
  const admin = await User.create({ name: 'Test Admin', email, passwordHash: await hashPassword(password), role: 'admin' });
  const anonymous = browser();
  const adminSession = browser();
  const { call } = adminSession;
  assert.equal((await call('/health')).status, 200);
  assert.equal((await call('/orders')).error.code, 'UNAUTHENTICATED');
  assert.equal((await call('/dashboard/summary1')).status, 401);
  assert.equal((await call('/auth/login', 'POST', { email, password })).error.code, 'INVALID_CSRF');
  const csrf = await call('/auth/csrf');
  assert.match(csrf.setCookie, /fixflow\.sid=.+HttpOnly; SameSite=Lax/i);
  const beforeLogin = adminSession.cookie;
  const oldToken = adminSession.token;
  assert.equal((await call('/auth/login', 'POST', { email, password }, { Origin: 'https://example.test' })).status, 403);
  const invalid = await adminSession.login(email, 'wrong password');
  assert.equal(invalid.error.code, 'INVALID_CREDENTIALS');
  assert.deepEqual((await adminSession.login('unknown@example.test', 'wrong password')).error, invalid.error);
  const loggedIn = await adminSession.login(' ADMIN@example.test ', password);
  assert.equal(loggedIn.status, 200);
  assert.notEqual(adminSession.cookie, beforeLogin);
  assert.notEqual(adminSession.token, oldToken);
  assert.equal(loggedIn.data.user.id, String(admin._id));
  assert.equal(loggedIn.data.user.passwordHash, undefined);
  assert.equal(loggedIn.data.user.sessionVersion, undefined);
  assert.equal((await anonymous.call('/auth/me', 'GET', undefined, { Cookie: beforeLogin })).status, 401);
  assert.equal((await anonymous.call('/auth/me', 'GET', undefined, { Cookie: adminSession.cookie })).data.user.id, String(admin._id));
  assert.ok(await mongoose.connection.collection('sessions').countDocuments());
  assert.ok((await User.collection.indexes()).some(index => index.key.email === 1 && index.unique));
  assert.deepEqual((await call('/orders/statuses')).data, ORDER_STATUSES);
  const values = { customerName: 'عميل تجريبي', phone: '٠٥۰۱۲۳٤٥٦٧', deviceType: 'جوال', deviceName: 'Test [phone]', problem: 'فحص' };
  assert.equal((await call('/orders', 'POST', values, { 'X-CSRF-Token': '' })).error.code, 'INVALID_CSRF');
  assert.equal((await call('/orders', 'POST', '{bad')).status, 400);
  assert.equal((await call('/orders', 'POST', 'bad', { 'Content-Type': 'text/plain' })).status, 415);
  const first = await call('/orders', 'POST', values);
  assert.equal(first.status, 201); assert.equal(first.data.id, 1001);
  assert.equal(first.data.phone, '0501234567'); assert.equal(first.data.serialNumber, '');
  assert.equal(first.data._id, undefined); assert.equal(first.data.__v, undefined);
  assert.equal(String((await Order.findOne({ id: 1001 })).createdBy), String(admin._id));
  const parallel = await Promise.all(Array.from({ length: 12 }, () => call('/orders', 'POST', values)));
  assert.ok(parallel.every(r => r.status === 201));
  assert.equal(new Set(parallel.map(r => r.data.id)).size, 12);
  assert.ok((await Order.collection.indexes()).some(i => i.key.id === 1 && i.unique));
  const list = await call('/orders?limit=2&page=2');
  assert.equal(list.data.length, 2); assert.equal(list.meta.total, 13); assert.equal(list.meta.totalPages, 7);
  assert.equal((await call('/orders?search=' + encodeURIComponent('١٠٠١'))).data[0].id, 1001);
  assert.equal((await call('/orders?search=' + encodeURIComponent('۱۰۰۱'))).data[0].id, 1001);
  assert.equal((await call('/orders?search=' + encodeURIComponent('.*'))).meta.total, 0);
  assert.equal((await call('/orders?search=' + encodeURIComponent('[phone]'))).meta.total, 13);
  assert.equal((await call('/orders?search=' + encodeURIComponent('عميل'))).meta.total, 13);
  assert.equal((await call('/orders?search=050123')).meta.total, 13);
  assert.equal((await call('/orders?status=' + encodeURIComponent(ORDER_STATUSES[2]))).meta.total, 0);
  for (const [path, status] of [['/orders/bad',400],['/orders/999999',404],['/orders?page=-1',400],['/orders?limit=101',400],['/orders?search=a&search=b',400]]) assert.equal((await call(path)).status, status);
  assert.equal((await call('/orders', 'POST', { ...values, id: 9 })).status, 422);
  assert.equal((await call('/orders', 'POST', { ...values, phone: 'bad' })).status, 422);
  const changed = await call('/orders/1001','PATCH',{ problem: 'تعديل محفوظ' });
  assert.equal(changed.status,200); assert.equal(changed.data.createdAt, first.data.createdAt);
  assert.equal(changed.data.id,1001); assert.equal(changed.data.problem,'تعديل محفوظ');
  assert.equal((await call('/orders/1001','PATCH',{})).status,422);
  assert.equal((await call('/orders/1001','PATCH',{status:ORDER_STATUSES[4]})).status,422);
  assert.equal((await call('/orders/1001/status','PATCH',{status:'bad'})).status,422);
  assert.equal((await call('/orders/1001','PATCH',{problem:'bad'},{'X-CSRF-Token':oldToken})).error.code, 'INVALID_CSRF');
  const canceled = await call('/orders/1001/status','PATCH',{status:ORDER_STATUSES[4]});
  assert.equal(canceled.data.problem,'تعديل محفوظ'); assert.equal(canceled.data.status,ORDER_STATUSES[4]);
  let summary = (await call('/dashboard/summary')).data;
  assert.equal(summary.totalOrders,13); assert.equal(summary.byStatus[ORDER_STATUSES[4]],1);
  assert.equal(summary.recentOrders.length,5); assert.equal(Object.keys(summary.byStatus).length,5);
  await seed();
  assert.equal(await Order.countDocuments(),20);
  assert.equal((await call('/orders','POST',values)).data.id,1043);
  await call('/orders/1042','PATCH',{problem:'لا تستبدل هذا التعديل'});
  const before = await Order.findOne({id:1042}).lean();
  await seed();
  assert.equal(await Order.countDocuments(),21);
  const after = await Order.findOne({id:1042}).lean();
  assert.equal(after.problem,before.problem); assert.equal(+after.updatedAt,+before.updatedAt);
  assert.equal((await call('/orders','POST',values)).data.id,1044);
  await mongoose.disconnect();
  assert.equal((await call('/health')).status,503);
  assert.equal((await call('/orders','POST',values)).status,503);
  await connectDatabase(uri.toString());
  const restarted = createApp(settings).listen(0, '127.0.0.1');
  await once(restarted, 'listening');
  t.after(() => new Promise(resolve => restarted.close(resolve)));
  base = `http://127.0.0.1:${restarted.address().port}/api/v1`;
  assert.equal((await call('/orders/1001')).data.problem,'تعديل محفوظ');
  assert.equal((await call('/orders/1001')).data.status,ORDER_STATUSES[4]);
  assert.equal((await call('/dashboard/summary1')).data.totalOrders, 22);
  const staffEmail = 'staff@example.test';
  const created = await call('/users', 'POST', { name: 'Test Staff', email: staffEmail });
  assert.equal(created.status, 201);
  const staff = created.data.user;
  const temporary = created.data.temporaryPassword;
  assert.equal(staff.role, 'staff');
  assert.equal(staff.mustChangePassword, true);
  assert.equal((await call('/users', 'POST', { name: 'Duplicate', email: staffEmail.toUpperCase() })).error.code, 'DUPLICATE_EMAIL');
  assert.equal((await call('/users', 'POST', { name: 'Injected', email: staffEmail, sessionVersion: 1 })).status, 422);
  const worker = browser();
  assert.equal((await worker.login(staffEmail, temporary)).status, 200);
  assert.equal((await worker.call('/orders')).error.code, 'PASSWORD_CHANGE_REQUIRED');
  const otherWorker = browser();
  assert.equal((await otherWorker.login(staffEmail, temporary)).status, 200);
  const permanent = randomBytes(24).toString('base64url');
  assert.equal((await worker.call('/auth/change-password', 'POST', { currentPassword: 'invalid', newPassword: permanent })).status, 422);
  assert.equal((await worker.call('/auth/change-password', 'POST', { currentPassword: temporary, newPassword: 'short' })).status, 422);
  assert.equal((await worker.call('/auth/change-password', 'POST', { currentPassword: temporary, newPassword: permanent })).status, 200);
  assert.equal((await otherWorker.call('/auth/me')).status, 401);
  assert.equal((await worker.call('/auth/me')).status, 401);
  assert.equal((await worker.login(staffEmail, permanent)).status, 200);
  assert.equal((await worker.call('/users')).error.code, 'FORBIDDEN');
  assert.equal((await worker.call('/orders')).status, 200);
  assert.equal((await worker.call('/orders', 'POST', values)).status, 201);
  assert.equal((await worker.call('/orders/1002', 'PATCH', { problem: 'Staff edit' })).status, 200);
  assert.equal((await worker.call('/orders/1002/status', 'PATCH', { status: ORDER_STATUSES[1] })).status, 200);
  assert.equal((await worker.call('/orders/1002/status', 'PATCH', { status: ORDER_STATUSES[4] })).error.code, 'FORBIDDEN');
  assert.equal((await worker.call('/orders/1001', 'PATCH', { problem: 'Blocked' })).error.code, 'FORBIDDEN');
  assert.equal((await worker.call('/orders/1001/status', 'PATCH', { status: ORDER_STATUSES[1] })).error.code, 'FORBIDDEN');
  const staffPath = `/users/${staff.id}`;
  assert.equal((await call(staffPath, 'PATCH', { role: 'admin' })).status, 200);
  assert.equal((await worker.call('/auth/me')).status, 401);
  assert.equal((await worker.login(staffEmail, permanent)).data.user.role, 'admin');
  const removals = await Promise.all([
    call(`/users/${admin._id}`, 'PATCH', { role: 'staff' }),
    worker.call(staffPath, 'PATCH', { role: 'staff' }),
  ]);
  assert.deepEqual(removals.map(result => result.status).sort(), [200, 409]);
  const [remaining] = await User.find({ role: 'admin', isActive: true });
  assert.equal(await User.countDocuments({ role: 'admin', isActive: true }), 1);
  const manager = remaining.id === staff.id ? worker : adminSession;
  const inactive = remaining.id === staff.id ? admin : staff;
  const former = remaining.id === staff.id ? adminSession : worker;
  assert.equal((await manager.call(`/users/${remaining.id}`, 'PATCH', { isActive: false })).error.code, 'LAST_ADMIN');
  assert.equal((await manager.call(`/users/${remaining.id}`, 'PATCH', { role: 'staff' })).error.code, 'LAST_ADMIN');
  const formerPassword = inactive.email === staffEmail ? permanent : password;
  assert.equal((await former.call('/auth/me')).status, 401);
  assert.equal((await former.login(inactive.email, formerPassword)).status, 200);
  assert.equal((await manager.call(`/users/${inactive.id}`, 'PATCH', { isActive: false })).status, 200);
  assert.equal((await former.call('/auth/me')).status, 401);
  assert.deepEqual((await former.login(inactive.email, formerPassword)).error, invalid.error);
  assert.equal((await manager.call(`/users/${inactive.id}`, 'PATCH', { isActive: true })).status, 200);
  assert.equal((await former.login(inactive.email, formerPassword)).status, 200);
  const reset = await manager.call(`/users/${inactive.id}/reset-password`, 'POST', {});
  assert.equal(reset.status, 200);
  assert.notEqual(reset.data.temporaryPassword, formerPassword);
  assert.equal((await former.call('/auth/me')).status, 401);
  assert.equal((await former.login(inactive.email, reset.data.temporaryPassword)).data.user.mustChangePassword, true);
  const users = await manager.call('/users');
  for (const secret of [password, temporary, permanent, reset.data.temporaryPassword, 'passwordHash', 'sessionVersion', 'temporaryPassword']) {
    assert.ok(!JSON.stringify(users).includes(secret));
  }
  assert.equal(users.status, 200);
  const saved = manager.cookie;
  assert.equal((await manager.call('/auth/logout', 'POST', {})).status, 200);
  assert.equal((await anonymous.call('/auth/me', 'GET', undefined, { Cookie: saved })).status, 401);
  const sessions = mongoose.connection.collection('sessions');
  const storedSession = cookie => decodeURIComponent(cookie.split('=')[1]).slice(2).split('.')[0];
  assert.equal(await sessions.findOne({ _id: storedSession(saved) }), null);
  const formerSessionId = storedSession(former.cookie);
  await sessions.updateOne({ _id: formerSessionId }, { $set: { expires: new Date(0) } });
  assert.equal((await former.call('/auth/me')).status, 401);
  assert.equal((await former.login(inactive.email, reset.data.temporaryPassword)).status, 200);
  const currentId = storedSession(former.cookie);
  const stored = JSON.parse((await sessions.findOne({ _id: currentId })).session);
  stored.startedAt -= settings.absoluteMs + 1000;
  await sessions.updateOne({ _id: currentId }, { $set: { session: JSON.stringify(stored) } });
  assert.equal((await former.call('/auth/me')).status, 401);
  const events = await mongoose.connection.collection('auditLogs').find().toArray();
  for (const event of ['login_failed', 'login_succeeded', 'password_changed', 'password_reset', 'user_created', 'user_role_changed', 'user_disabled', 'order_canceled', 'order_status_changed']) {
    assert.ok(events.some(log => log.event === event), event);
  }
  const auditData = JSON.stringify(events);
  for (const secret of [password, temporary, permanent, reset.data.temporaryPassword, saved, values.phone, staffEmail]) {
    assert.ok(!auditData.includes(secret));
  }
  let limited;
  for (let attempt = 0; attempt <= 10; attempt++) {
    limited = await anonymous.login(email, 'wrong password');
    if (limited.status === 429) break;
  }
  assert.equal(limited.status, 429);
});
