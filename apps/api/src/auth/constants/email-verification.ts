import { EMAIL_VERIFICATION_CODE_LENGTH } from '@ludora/security';

import {
    CRYPTO_ENCODING,
    HASH_ALGORITHM,
    SECONDS_PER_MINUTE,
} from '../../common/constants/index.js';

export const EMAIL_VERIFICATION_CONFIG = {
    codeLength: EMAIL_VERIFICATION_CODE_LENGTH,
    expiresInSeconds: 10 * SECONDS_PER_MINUTE,
    maxFailedAttempts: 5,
    resendCooldownSeconds: SECONDS_PER_MINUTE,
    minRetryAfterSeconds: 1,
} as const;

export const EMAIL_VERIFICATION_HASH_CONFIG = {
    algorithm: HASH_ALGORITHM.sha256,
    encoding: CRYPTO_ENCODING.hex,
} as const;
