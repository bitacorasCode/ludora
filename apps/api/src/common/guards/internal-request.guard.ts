import {
    type CanActivate,
    type ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

import { INTERNAL_REQUEST_ERRORS } from '../constants/index.js';
import { InternalRequestService } from '../services/index.js';

@Injectable()
export class InternalRequestGuard implements CanActivate {
    constructor(
        private readonly internalRequestService: InternalRequestService,
    ) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();

        if (!this.internalRequestService.isTrusted(request)) {
            const { message, errorCode } =
                INTERNAL_REQUEST_ERRORS.untrustedRequest;

            throw new ForbiddenException(message, { errorCode });
        }

        return true;
    }
}
