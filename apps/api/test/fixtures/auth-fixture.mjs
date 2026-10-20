// Local browser-test support. Never imported by the application.
/* eslint no-unused-vars: error, unused-imports/no-unused-vars: off -- Use JavaScript scope checks in this standalone Node fixture. */
import { readFileSync } from 'node:fs';

import { JwtService } from '@nestjs/jwt';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: new URL('../../.env', import.meta.url), quiet: true });
const account = JSON.parse(readFileSync(0, 'utf8'));

if (!/^e2e-[a-f0-9-]+@example\.test$/.test(account.email)) {
  throw new Error('Only temporary E2E accounts are allowed.');
}

if (process.argv[2] === 'delete') {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query('DELETE FROM users WHERE id = $1::uuid AND email = $2', [account.id, account.email]);
  } finally {
    await pool.end();
  }
} else if (process.argv[2] === 'expired-token') {
  if (!process.env.JWT_SECRET) throw new Error('Missing JWT_SECRET for the local API fixture.');
  const jwt = new JwtService({ secret: process.env.JWT_SECRET });
  const token = await jwt.signAsync({ sub: account.id }, {
    algorithm: 'HS256', expiresIn: -60, issuer: 'ludora-api', audience: 'ludora-web',
  });
  process.stdout.write(token);
} else {
  throw new Error('Unsupported auth fixture operation.');
}
