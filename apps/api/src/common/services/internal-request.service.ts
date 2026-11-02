import { timingSafeEqual } from 'node:crypto';

import { HEX_64_PATTERN, INTERNAL_REQUEST_HEADERS } from '@ludora/security';
import { isValidIp } from '@ludora/security/server';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import { CRYPTO_ENCODING } from '../constants/crypto.js';

const { utf8: secretEncoding } = CRYPTO_ENCODING;

@Injectable()
export class InternalRequestService {
    private readonly secret: Buffer;

    constructor(config: ConfigService) {
        const secret = config.getOrThrow<string>('INTERNAL_API_SECRET');

        if (!HEX_64_PATTERN.test(secret)) {
            throw new Error(
                'INTERNAL_API_SECRET must contain 64 hexadecimal characters.',
            );
        }

        this.secret = Buffer.from(secret, secretEncoding);
    }

    isTrusted(request: Request): boolean {
        const receivedSecret =
            request.headers[INTERNAL_REQUEST_HEADERS.secret];

        if (typeof receivedSecret !== 'string') {
            return false;
        }

        const received = Buffer.from(receivedSecret, secretEncoding);

        return received.length === this.secret.length
            && timingSafeEqual(received, this.secret);
    }

    getForwardedClientIp(request: Request): string | undefined {
        if (!this.isTrusted(request)) {
            return undefined;
        }

        const receivedIp =
            request.headers[INTERNAL_REQUEST_HEADERS.clientIp];

        if (typeof receivedIp !== 'string') {
            return undefined;
        }

        const clientIp = receivedIp.trim();

        if (!isValidIp(clientIp)) {
            return undefined;
        }

        return clientIp;
    }
}
