import {
    type ExecutionContext,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    InjectThrottlerOptions,
    InjectThrottlerStorage,
    ThrottlerGuard,
    type ThrottlerLimitDetail,
    type ThrottlerModuleOptions,
    type ThrottlerStorage,
} from '@nestjs/throttler';
import type { Request } from 'express';

import { RATE_LIMIT_ERRORS } from '../constants/errors.js';
import { TooManyRequestsException } from '../exceptions/too-many-requests.exception.js';
import { ClientIpService } from '../services/client-ip.service.js';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
    constructor(
        @InjectThrottlerOptions()
        options: ThrottlerModuleOptions,
        @InjectThrottlerStorage()
        storage: ThrottlerStorage,
        reflector: Reflector,
        private readonly clientIpService: ClientIpService,
    ) {
        super(options, storage, reflector);
    }

    protected override getTracker(request: Request): Promise<string> {
        const clientIp = this.clientIpService.getClientIp(request);

        if (!clientIp) {
            const { message, errorCode } =
                RATE_LIMIT_ERRORS.clientIpUnavailable;

            throw new InternalServerErrorException(message, {
                errorCode,
            });
        }

        return super.getTracker({ ip: clientIp });
    }

    protected override async throwThrottlingException(
        _context: ExecutionContext,
        { timeToBlockExpire }: ThrottlerLimitDetail,
    ): Promise<void> {
        const { message, errorCode } = RATE_LIMIT_ERRORS.exceeded;

        throw new TooManyRequestsException(message, {
            errorCode,
            retryAfterSeconds: timeToBlockExpire,
        });
    }
}
