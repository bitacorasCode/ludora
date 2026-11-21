import { createHmac } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CRYPTO_ENCODING, HASH_ALGORITHM } from '../../common/constants/index.js';
import { hashOpaqueToken } from '../utils/opaque-token.js';

const RECOVERY_TOKEN_KEY_CONTEXT = 'ludora/password-recovery-token/v1';

@Injectable()
export class PasswordResetTokenService {
    private readonly recoveryKey: Buffer;

    constructor(config: ConfigService) {
        this.recoveryKey = createHmac(HASH_ALGORITHM.sha256, config.getOrThrow<string>('JWT_SECRET'))
            .update(RECOVERY_TOKEN_KEY_CONTEXT)
            .digest();
    }

    createForJob(jobId: string) {
        // The same job can retry delivery without storing the raw credential.
        const token = createHmac(HASH_ALGORITHM.sha256, this.recoveryKey)
            .update(jobId)
            .digest(CRYPTO_ENCODING.base64url);

        return { token, tokenHash: this.hash(token) };
    }

    hash(token: string): string {
        return hashOpaqueToken(token);
    }
}
