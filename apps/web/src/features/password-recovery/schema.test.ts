import { describe, expect, it } from 'vitest';

import { passwordResetTokenSchema } from './schema';

describe('passwordResetTokenSchema', () => {
  it('accepts the token format used in recovery links', () => {
    const token = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

    expect(passwordResetTokenSchema.safeParse(token)).toMatchObject({
      success: true,
      data: token,
    });
  });

  it('accepts the base64url alphabet without padding', () => {
    expect(passwordResetTokenSchema.safeParse('AA-_').success).toBe(true);
  });

  it.each([undefined, null, '', ['AAAA'], ['AAAA', 'BBBB'], 'not a token', 'AA==', 123, {}])(
    'rejects a missing, malformed, or repeated query parameter: %j',
    (token) => {
      const result = passwordResetTokenSchema.safeParse(token);

      expect(result.success).toBe(false);
      expect(result.error?.issues).not.toHaveLength(0);
    },
  );
});
