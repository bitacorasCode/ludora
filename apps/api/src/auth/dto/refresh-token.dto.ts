import { z } from 'zod';

import { OPAQUE_TOKEN_ENCODED_LENGTH } from '../utils/opaque-token.js';

export const refreshTokenSchema = z.strictObject({
    refreshToken: z.base64url().length(OPAQUE_TOKEN_ENCODED_LENGTH),
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
