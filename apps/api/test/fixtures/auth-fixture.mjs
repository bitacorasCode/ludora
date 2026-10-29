// Local browser-test support. Never imported by the application.
/* eslint no-unused-vars: error, unused-imports/no-unused-vars: off -- Use JavaScript scope checks in this standalone Node fixture. */
import { readFileSync } from 'node:fs';

import { JwtService } from '@nestjs/jwt';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: new URL('../../.env', import.meta.url), quiet: true });
const account = JSON.parse(readFileSync(0, 'utf8'));

const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;

if (
  typeof account.email !== 'string'
  || !/^e2e-[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}@example\.test$/.test(account.email)
) {
  throw new Error('Only temporary E2E accounts are allowed.');
}

if (account.id !== undefined && (typeof account.id !== 'string' || !uuid.test(account.id))) {
  throw new Error('The temporary E2E account ID must be a UUID.');
}

if (process.argv[2] === 'delete') {
  if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL for the local API fixture.');
  const database = new URL(process.env.DATABASE_URL);
  if (
    !['postgres:', 'postgresql:'].includes(database.protocol)
    || !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname)
    || process.env.NODE_ENV === 'production'
  ) {
    throw new Error('Temporary E2E accounts can only be deleted from a local development database.');
  }
  const pool = new pg.Pool({ connectionString: database.href });
  try {
    if (account.id) {
      await pool.query('DELETE FROM users WHERE id = $1::uuid AND email = $2', [account.id, account.email]);
    } else {
      // Registration can succeed even when a browser assertion fails before its ID is available.
      await pool.query('DELETE FROM users WHERE email = $1', [account.email]);
    }
  } finally {
    await pool.end();
  }
} else if (process.argv[2] === 'expired-token') {
  if (!account.id) throw new Error('A temporary E2E account ID is required to create an expired token.');
  if (!process.env.JWT_SECRET) throw new Error('Missing JWT_SECRET for the local API fixture.');
  const jwt = new JwtService({ secret: process.env.JWT_SECRET });
  const token = await jwt.signAsync({ sub: account.id }, {
    algorithm: 'HS256', expiresIn: -60, issuer: 'ludora-api', audience: 'ludora-web',
  });
  process.stdout.write(token);
} else {
  throw new Error('Unsupported auth fixture operation.');
}
