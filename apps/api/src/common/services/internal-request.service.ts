import { timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import { INTERNAL_REQUEST_HEADERS } from '../constants/internal-request.js';

@Injectable()
export class InternalRequestService {
    private readonly secret: Buffer;

    constructor(config: ConfigService) {
        const secret = config.getOrThrow<string>('INTERNAL_API_SECRET');

        if (!/^[a-f0-9]{64}$/i.test(secret)) {
            throw new Error(
                'INTERNAL_API_SECRET must contain 64 hexadecimal characters.',
            );
        }

        this.secret = Buffer.from(secret, 'utf8');
    }

    isTrusted(request: Request): boolean {
        const receivedSecret =
            request.headers[INTERNAL_REQUEST_HEADERS.secret];

        if (typeof receivedSecret !== 'string') {
            return false;
        }

        const received = Buffer.from(receivedSecret, 'utf8');

        return received.length === this.secret.length
            && timingSafeEqual(received, this.secret);
    }
}