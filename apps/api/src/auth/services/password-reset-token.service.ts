import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { MILLISECONDS_PER_SECOND } from '../../common/constants/time.js';
import { PASSWORD_RESET_CONFIG } from '../constants/password-reset.js';

@Injectable()
export class PasswordResetTokenService {
    create() {
        const { tokenBytes, tokenEncoding, expiresInSeconds } = PASSWORD_RESET_CONFIG;
        const token = randomBytes(tokenBytes).toString(tokenEncoding);
        const expiresAt = new Date(
            Date.now() + expiresInSeconds * MILLISECONDS_PER_SECOND,
        );

        return {
            token,
            tokenHash: this.hash(token),
            expiresAt,
        };
    }

    hash(token: string): string {
        const { hashAlgorithm, hashEncoding } = PASSWORD_RESET_CONFIG;

        return createHash(hashAlgorithm)
            .update(token)
            .digest(hashEncoding);
    }
}
