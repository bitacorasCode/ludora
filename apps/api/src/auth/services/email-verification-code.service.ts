import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import { HEX_64_PATTERN } from '@ludora/security';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
    EMAIL_VERIFICATION_CONFIG,
    EMAIL_VERIFICATION_HASH_CONFIG,
} from '../constants/email-verification.js';

const DECIMAL_BASE = 10;
const CODE_PADDING_DIGIT = '0';
const { algorithm, encoding } = EMAIL_VERIFICATION_HASH_CONFIG;

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

        this.secret = Buffer.from(secret, encoding);
    }

    generate(): string {
        const { codeLength } = EMAIL_VERIFICATION_CONFIG;

        return randomInt(0, DECIMAL_BASE ** codeLength)
            .toString()
            .padStart(codeLength, CODE_PADDING_DIGIT);
    }

    hash(verificationId: string, code: string): string {
        return createHmac(algorithm, this.secret)
            .update(`${verificationId}:${code}`)
            .digest(encoding);
    }

    verify(
        verificationId: string,
        code: string,
        storedHash: string,
    ): boolean {
        const expected = Buffer.from(storedHash, encoding);
        const actual = Buffer.from(
            this.hash(verificationId, code),
            encoding,
        );

        return expected.length === actual.length
            && timingSafeEqual(expected, actual);
    }
}
