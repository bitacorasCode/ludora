import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import { HEX_64_PATTERN } from '@ludora/security';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EMAIL_VERIFICATION_CONFIG } from '../constants/email-verification.js';

@Injectable()
export class EmailVerificationCodeService {
    private readonly secret: Buffer;

    constructor(config: ConfigService) {
        const secret = config.getOrThrow<string>(
            'EMAIL_VERIFICATION_SECRET',
        );

        if (!HEX_64_PATTERN.test(secret)) {
            throw new Error(
                'EMAIL_VERIFICATION_SECRET must contain 64 hexadecimal characters.',
            );
        }

        this.secret = Buffer.from(secret, 'hex');
    }

    generate(): string {
        const { codeLength } = EMAIL_VERIFICATION_CONFIG;

        return randomInt(0, 10 ** codeLength)
            .toString()
            .padStart(codeLength, '0');
    }

    hash(verificationId: string, code: string): string {
        return createHmac('sha256', this.secret)
            .update(`${verificationId}:${code}`)
            .digest('hex');
    }

    verify(
        verificationId: string,
        code: string,
        storedHash: string,
    ): boolean {
        const expected = Buffer.from(storedHash, 'hex');
        const actual = Buffer.from(
            this.hash(verificationId, code),
            'hex',
        );

        return expected.length === actual.length
            && timingSafeEqual(expected, actual);
    }
}
