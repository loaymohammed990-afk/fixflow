import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDigits, createSchema, updateSchema, statusSchema, querySchema, parse, parseId } from '../src/validators/order.validator.js';
import { escapeRegex } from '../src/services/order.service.js';
const input = { customerName: 'عميل تجريبي', phone: '٠٥۰۱۲۳٤٥٦٧', deviceType: 'جوال', deviceName: 'هاتف', problem: 'فحص' };
test('normalizes both digit alphabets and trims fields', () => {
  assert.equal(normalizeDigits('١٢۳۴'), '1234');
  assert.equal(parse(createSchema, { ...input, customerName: ' عميل ' }).customerName, 'عميل');
  assert.equal(parse(createSchema, input).phone, '0501234567');
});
test('rejects protected/unknown fields, invalid phone, empty and invalid updates', () => {
  for (const field of ['id', '_id', 'status', 'createdAt', 'updatedAt', '$set', 'unknown']) {
    assert.throws(() => parse(createSchema, { ...input, [field]: 'bad' }), e => e.status === 422);
    assert.throws(() => parse(updateSchema, { [field]: 'bad' }), e => e.status === 422);
  }
  for (const phone of ['abc123', { $ne: '' }, '123456', '1'.repeat(16)]) assert.throws(() => parse(createSchema, { ...input, phone }));
  assert.throws(() => parse(updateSchema, {}));
  assert.throws(() => parse(statusSchema, { status: 'unknown' }));
  assert.throws(() => parse(createSchema, { ...input, problem: ' '.repeat(3) }));
});
test('validates positive safe IDs and strict queries, literal regex', () => {
  for (const id of ['-1', '0', '1.5', 'abc', '9007199254740992', '1e3']) assert.throws(() => parseId(id), e => e.code === 'INVALID_ORDER_ID');
  assert.equal(parseId('1042'), 1042);
  assert.deepEqual(parse(querySchema, {}, true), { search: '', status: '', page: 1, limit: 10 });
  for (const query of [{ limit: '101' }, { page: '0' }, { search: ['a', 'b'] }, { '$where': 'bad' }, { page: '9007199254740991', limit: '100' }]) assert.throws(() => parse(querySchema, query, true), e => e.status === 400);
  assert.equal(new RegExp(escapeRegex('.*[a](b)+?')).test('.*[a](b)+?'), true);
  assert.equal(new RegExp(escapeRegex('.*')).test('anything'), false);
});
