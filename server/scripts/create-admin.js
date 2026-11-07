import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { hashPassword } from '../src/services/password.service.js';
import { createUserSchema, newPassword } from '../src/validators/user.validator.js';

async function createAdmin() {
  const { stdin, stdout } = process;
  if (!stdin.isTTY || !stdout.isTTY) throw new Error('Interactive terminal required.');
  let hidden = false;
  const output = new Writable({
    write(chunk, encoding, done) {
      if (hidden) done();
      else stdout.write(chunk, encoding, done);
    },
  });
  output.columns = stdout.columns;
  const prompt = createInterface({ input: stdin, output, terminal: true, historySize: 0 });
  const controller = new AbortController();
  prompt.on('SIGINT', () => controller.abort());
  const options = { signal: controller.signal };
  let values;
  let password;
  try {
    values = createUserSchema.safeParse({
      name: await prompt.question('Name: ', options),
      email: await prompt.question('Email: ', options),
      role: 'admin',
    });
    if (!values.success) throw new Error('Enter a valid name and email address.');
    stdout.write('Password (hidden, at least 12 characters): ');
    hidden = true;
    password = await prompt.question('', options);
    stdout.write('\n');
    if (!newPassword.safeParse(password).success) throw new Error('Invalid password length.');
  } finally {
    prompt.close();
  }

  try {
    await mongoose.connect(config.uri, { serverSelectionTimeoutMS: 3000 });
    await User.createIndexes();
    if (await User.exists({ email: values.data.email })) throw Object.assign(new Error(), { code: 11000 });
    await User.create({ ...values.data, passwordHash: await hashPassword(password) });
    console.log('Admin account created.');
  } catch (error) {
    throw new Error(error.code === 11000 ? 'That email already exists.' : 'Unable to create account. Check MongoDB and server/.env.');
  } finally {
    await mongoose.disconnect();
  }
}

try {
  await createAdmin();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
