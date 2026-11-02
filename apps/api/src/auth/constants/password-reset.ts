import { CRYPTO_ENCODING, HASH_ALGORITHM } from '../../common/constants/crypto.js';
import { SECONDS_PER_MINUTE } from '../../common/constants/time.js';

export const PASSWORD_RESET_CONFIG = {
    tokenBytes: 32,
    tokenEncoding: CRYPTO_ENCODING.base64url,
    hashAlgorithm: HASH_ALGORITHM.sha256,
    hashEncoding: CRYPTO_ENCODING.hex,
    expiresInSeconds: 30 * SECONDS_PER_MINUTE,
    requestCooldownSeconds: SECONDS_PER_MINUTE,
} as const;
