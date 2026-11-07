import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';

export const temporaryPassword = () => randomBytes(24).toString('base64url');
export const hashPassword = password => argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
});
export const verifyPassword = (hash, password) => argon2.verify(hash, password);
