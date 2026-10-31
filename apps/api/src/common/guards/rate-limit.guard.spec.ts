import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { ThrottlerStorageService } from '@nestjs/throttler';
import type { Request } from 'express';
import { vi } from 'vitest';

import { AuthController } from '../../auth/auth.controller.js';
import { AUTH_RATE_LIMIT_CONFIG, RATE_LIMIT_CONFIG } from '../../config/rate-limit.js';
import { HTTP_ERROR_NAMES, RATE_LIMIT_ERRORS } from '../constants/errors.js';
import { MILLISECONDS_PER_SECOND } from '../constants/time.js';
import { TooManyRequestsException } from '../exceptions/too-many-requests.exception.js';
import { ClientIpService } from '../services/client-ip.service.js';
import { InternalRequestService } from '../services/internal-request.service.js';
import { RateLimitGuard } from './rate-limit.guard.js';

describe('RateLimitGuard', () => {
    let guard: RateLimitGuard;
    let storage: ThrottlerStorageService;
    let clientIpService: ClientIpService;
    let request: Request;
    let context: ExecutionContextHost;

    const clientIp = '203.0.113.10';
    const response = { header: vi.fn() };
    const { limit: loginLimit, blockDuration: loginBlockDurationMs } = AUTH_RATE_LIMIT_CONFIG.login;
    const loginBlockSeconds = loginBlockDurationMs / MILLISECONDS_PER_SECOND;

    function createContext(handler: keyof AuthController = 'login') {
        return new ExecutionContextHost(
            [request, response],
            AuthController,
            AuthController.prototype[handler],
        );
    }

    async function reachLimit(target = context, limit: number = loginLimit) {
        for (let attempt = 0; attempt < limit; attempt++) {
            await expect(guard.canActivate(target)).resolves.toBe(true);
        }
    }

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-31T12:00:00.000Z'));
        response.header.mockClear();

        // Only local configuration and an HTTP context are constructed: no DB or SMTP.
        const config = new ConfigService({
            INTERNAL_API_SECRET: 'a'.repeat(64),
            RENDER: 'false',
        });
        clientIpService = new ClientIpService(new InternalRequestService(config), config);
        storage = new ThrottlerStorageService();
        guard = new RateLimitGuard([RATE_LIMIT_CONFIG], storage, new Reflector(), clientIpService);
        await guard.onModuleInit();

        request = {
            headers: {},
            socket: { remoteAddress: clientIp },
        } as Request;
        context = createContext();
    });

    afterEach(() => {
        storage.onApplicationShutdown();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('canActivate', () => {
        it.each(['login', 'register', 'verifyEmail', 'resendVerification'] as const)(
            'should apply the endpoint policy for %s instead of the default policy',
            async (handler) => {
                const policy = AUTH_RATE_LIMIT_CONFIG[handler];
                const endpointContext = createContext(handler);

                await reachLimit(endpointContext, policy.limit);

                expect(response.header).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
                await expect(guard.canActivate(endpointContext)).rejects.toBeInstanceOf(TooManyRequestsException);
                expect(response.header).toHaveBeenCalledWith(
                    'Retry-After',
                    policy.blockDuration / MILLISECONDS_PER_SECOND,
                );
            },
        );

        it('should use the default policy for an endpoint without an override', async () => {
            const endpointContext = createContext('getMe');

            await reachLimit(endpointContext, RATE_LIMIT_CONFIG.limit);

            await expect(guard.canActivate(endpointContext)).rejects.toBeInstanceOf(TooManyRequestsException);
        });

        it('should return the error catalog, HTTP 429 and the wait in seconds without internal tracking data', async () => {
            await reachLimit();

            const rejection = guard.canActivate(context);

            await expect(rejection).rejects.toHaveProperty('status', HttpStatus.TOO_MANY_REQUESTS);
            await expect(rejection).rejects.toHaveProperty('response', {
                statusCode: HttpStatus.TOO_MANY_REQUESTS,
                error: HTTP_ERROR_NAMES.tooManyRequests,
                ...RATE_LIMIT_ERRORS.exceeded,
                retryAfterSeconds: loginBlockSeconds,
            });
            expect(response.header).toHaveBeenCalledWith('Retry-After', loginBlockSeconds);
        });

        it('should keep the client blocked until expiration and allow requests at the deadline', async () => {
            await reachLimit();
            await expect(guard.canActivate(context)).rejects.toBeInstanceOf(TooManyRequestsException);

            vi.advanceTimersByTime(loginBlockDurationMs - MILLISECONDS_PER_SECOND);

            await expect(guard.canActivate(context)).rejects.toHaveProperty('response.retryAfterSeconds', 1);
            expect(response.header).toHaveBeenCalledWith('Retry-After', 1);

            vi.advanceTimersByTime(MILLISECONDS_PER_SECOND);

            await expect(guard.canActivate(context)).resolves.toBe(true);
            expect(response.header).toHaveBeenCalledWith('X-RateLimit-Remaining', loginLimit - 1);
        });

        it('should not extend the block when the client keeps retrying', async () => {
            await reachLimit();
            await expect(guard.canActivate(context)).rejects.toBeInstanceOf(TooManyRequestsException);

            const halfBlockMs = loginBlockDurationMs / 2;
            vi.advanceTimersByTime(halfBlockMs);

            await expect(guard.canActivate(context)).rejects.toHaveProperty(
                'response.retryAfterSeconds',
                halfBlockMs / MILLISECONDS_PER_SECOND,
            );

            vi.advanceTimersByTime(halfBlockMs);

            await expect(guard.canActivate(context)).resolves.toBe(true);
        });

        it('should keep independent counters for different endpoints', async () => {
            await reachLimit();
            await expect(guard.canActivate(context)).rejects.toBeInstanceOf(TooManyRequestsException);

            await expect(guard.canActivate(createContext('register'))).resolves.toBe(true);
        });

        it('should use the resolved client IP and keep another client outside the block', async () => {
            await reachLimit();
            await expect(guard.canActivate(context)).rejects.toBeInstanceOf(TooManyRequestsException);
            const resolveIp = vi.spyOn(clientIpService, 'getClientIp').mockReturnValue('198.51.100.20');

            await expect(guard.canActivate(context)).resolves.toBe(true);

            expect(resolveIp).toHaveBeenCalledExactlyOnceWith(request);
        });

        it('should reject a missing client IP before accessing the rate limit storage', async () => {
            vi.spyOn(clientIpService, 'getClientIp').mockReturnValue(undefined);
            const increment = vi.spyOn(storage, 'increment');

            await expect(guard.canActivate(context)).rejects.toMatchObject({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                response: {
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    ...RATE_LIMIT_ERRORS.clientIpUnavailable,
                },
            });
            expect(increment).not.toHaveBeenCalled();
        });
    });
});
