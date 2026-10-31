import { timingSafeEqual } from 'node:crypto';

import { HEX_64_PATTERN, INTERNAL_REQUEST_HEADERS } from '@ludora/security';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

const INTERNAL_SECRET_ENCODING = 'utf8';

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

        this.secret = Buffer.from(secret, INTERNAL_SECRET_ENCODING);
    }

    isTrusted(request: Request): boolean {
        const receivedSecret =
            request.headers[INTERNAL_REQUEST_HEADERS.secret];

        if (typeof receivedSecret !== 'string') {
            return false;
        }

        const received = Buffer.from(receivedSecret, INTERNAL_SECRET_ENCODING);

        return received.length === this.secret.length
            && timingSafeEqual(received, this.secret);
    }
}
