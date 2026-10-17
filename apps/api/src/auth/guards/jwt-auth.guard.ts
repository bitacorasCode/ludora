import {
    type CanActivate,
    type ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod';

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
            throw new UnauthorizedException('Authentication required.');
        }

        let payload: unknown;

        try {
            payload = await this.jwtService.verifyAsync(token);
        } catch {
            throw new UnauthorizedException('Invalid or expired token.');
        }

        const result = tokenPayloadSchema.safeParse(payload);

        if (!result.success) {
            throw new UnauthorizedException('Invalid token payload.');
        }

        request.auth = {
            userId: result.data.sub,
        };

        return true;
    }
}