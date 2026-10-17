import {
    type CanActivate,
    type ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod';

import { AUTH_ERRORS } from '../constants/auth-errors.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

const tokenPayloadSchema = z.object({
    sub: z.uuid(),
    exp: z.number().int(),
});

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<AuthenticatedRequest>();

        const token = request.headers.authorization
            ?.match(/^Bearer (\S+)$/i)?.[1];

        if (!token) {
            const { message, errorCode } = AUTH_ERRORS.authenticationRequired;

            throw new UnauthorizedException(message, {
                errorCode,
            });
        }

        let payload: unknown;

        try {
            payload = await this.jwtService.verifyAsync(token);
        } catch {
            const { message, errorCode } = AUTH_ERRORS.invalidToken;

            throw new UnauthorizedException(message, {
                errorCode
            });
        }

        const result = tokenPayloadSchema.safeParse(payload);

        if (!result.success) {
            const { message, errorCode } = AUTH_ERRORS.invalidTokenPayload;

            throw new UnauthorizedException(message, {
                errorCode,
            });
        }

        request.auth = {
            userId: result.data.sub,
        };

        return true;
    }
}
