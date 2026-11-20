import { createHash, randomBytes } from 'node:crypto';

import {
    CRYPTO_ENCODING,
    HASH_ALGORITHM,
} from '../../common/constants/crypto.js';

const OPAQUE_TOKEN_BYTES = 32;
const TOKEN_ENCODING = CRYPTO_ENCODING.base64url;

export const OPAQUE_TOKEN_ENCODED_LENGTH = Buffer.alloc(OPAQUE_TOKEN_BYTES)
    .toString(TOKEN_ENCODING).length;

export function createOpaqueToken() {
    const token = randomBytes(OPAQUE_TOKEN_BYTES).toString(TOKEN_ENCODING);

    return { token, tokenHash: hashOpaqueToken(token) };
}

export function hashOpaqueToken(token: string): string {
    return createHash(HASH_ALGORITHM.sha256)
        .update(token)
        .digest(CRYPTO_ENCODING.hex);
}
