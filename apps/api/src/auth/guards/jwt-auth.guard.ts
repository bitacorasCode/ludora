import {
    type CanActivate,
    type ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod';

import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS } from '../constants/index.js';
import { AuthSessionService } from '../services/auth-session.service.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

const BEARER_TOKEN_PATTERN = /^Bearer (\S+)$/i;

const tokenPayloadSchema = z.object({
    sub: z.uuid(),
    sid: z.uuid().optional(),
    exp: z.number().int(),
    authVersion: z.number().int().nonnegative(),
});

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly usersService: UsersService,
        private readonly authSessionService: AuthSessionService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<AuthenticatedRequest>();

        const [, token] = request.headers.authorization
            ?.match(BEARER_TOKEN_PATTERN) ?? [];

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

        const { sub: userId, sid: sessionId, authVersion } = result.data;
        const isActive = sessionId === undefined
            ? await this.isLegacyTokenValid(userId, authVersion)
            : await this.authSessionService.isActive(sessionId, userId, authVersion);

        if (!isActive) {
            const { message, errorCode } = AUTH_ERRORS.invalidToken;

            throw new UnauthorizedException(message, { errorCode });
        }

        request.auth = { userId, authVersion };

        return true;
    }

    private async isLegacyTokenValid(userId: string, authVersion: number): Promise<boolean> {
        const user = await this.usersService.findAuthenticationById(userId);

        return Boolean(user?.emailVerifiedAt && user.authVersion === authVersion);
    }
}
