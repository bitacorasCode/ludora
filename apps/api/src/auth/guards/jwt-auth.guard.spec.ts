import { HttpStatus } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { AUTH_ERRORS } from '../constants/auth-errors.js';
import { AuthSessionService } from '../services/auth-session.service.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
    let guard: JwtAuthGuard;
    let request: AuthenticatedRequest;
    let context: ExecutionContextHost;

    const token = 'signed-access-token';
    const userId = 'a0db3414-7659-46ee-8435-1a32f52b1f26';
    const sessionId = 'ecec41fa-b532-4cd3-9487-08dfadcd22ec';
    const payload = { sub: userId, sid: sessionId, exp: 1_793_793_600, authVersion: 0 };
    const legacyPayload = { sub: userId, exp: payload.exp, authVersion: payload.authVersion };
    const jwtService = {
        verifyAsync: vi.fn<(...args: Parameters<JwtService['verifyAsync']>) => Promise<unknown>>(),
    };
    const authSessions = { isActive: vi.fn<AuthSessionService['isActive']>() };

    beforeEach(async () => {
        vi.resetAllMocks();
        jwtService.verifyAsync.mockResolvedValue(payload);
        authSessions.isActive.mockResolvedValue(true);
        request = { headers: { authorization: `Bearer ${token}` } } as AuthenticatedRequest;
        context = new ExecutionContextHost([request]);

        const module = await Test.createTestingModule({
            providers: [
                { provide: JwtService, useValue: jwtService },
                { provide: AuthSessionService, useValue: authSessions },
                JwtAuthGuard,
            ],
        }).compile();
        guard = module.get(JwtAuthGuard);
    });

    describe('canActivate', () => {
        it('checks the persisted session on every request and rejects it after revocation', async () => {
            await expect(guard.canActivate(context)).resolves.toBe(true);
            expect(authSessions.isActive).toHaveBeenCalledExactlyOnceWith(sessionId, userId, payload.authVersion);
            expect(jwtService.verifyAsync).toHaveBeenCalledExactlyOnceWith(token);
            expect(jwtService.verifyAsync).toHaveBeenCalledBefore(authSessions.isActive);
            expect(request.auth).toEqual({ userId, authVersion: payload.authVersion, sessionId });

            authSessions.isActive.mockResolvedValue(false);
            const nextRequest = { headers: request.headers } as AuthenticatedRequest;
            await expect(guard.canActivate(new ExecutionContextHost([nextRequest]))).rejects.toMatchObject({
                status: HttpStatus.UNAUTHORIZED,
                response: AUTH_ERRORS.invalidToken,
            });
            expect(nextRequest.auth).toBeUndefined();
        });

        it.each([undefined, '', 'Basic credentials', 'Bearer', 'Bearer first second'])(
            'should reject a missing or malformed bearer header: %s',
            async (authorization) => {
                request.headers.authorization = authorization;

                await expect(guard.canActivate(context)).rejects.toMatchObject({
                    status: HttpStatus.UNAUTHORIZED,
                    response: AUTH_ERRORS.authenticationRequired,
                });

                expect(jwtService.verifyAsync).not.toHaveBeenCalled();
                expect(authSessions.isActive).not.toHaveBeenCalled();
                expect(request.auth).toBeUndefined();
            },
        );

        it('should reject an invalid or expired JWT before looking up the session', async () => {
            jwtService.verifyAsync.mockRejectedValue(new Error('JWT has expired'));

            await expect(guard.canActivate(context)).rejects.toMatchObject({
                status: HttpStatus.UNAUTHORIZED,
                response: AUTH_ERRORS.invalidToken,
            });

            expect(authSessions.isActive).not.toHaveBeenCalled();
            expect(request.auth).toBeUndefined();
        });

        it.each([
            null,
            {},
            legacyPayload,
            { ...payload, sid: 'not-a-uuid' },
            { ...payload, authVersion: undefined },
            { ...payload, sub: 'not-a-uuid' },
            { ...payload, exp: 'not-a-number' },
            { ...payload, authVersion: '0' },
            { ...payload, authVersion: -1 },
            { ...payload, authVersion: 0.5 },
        ])('should reject a malformed JWT payload: %j', async (invalidPayload) => {
            jwtService.verifyAsync.mockResolvedValue(invalidPayload);

            await expect(guard.canActivate(context)).rejects.toMatchObject({
                status: HttpStatus.UNAUTHORIZED,
                response: AUTH_ERRORS.invalidTokenPayload,
            });

            expect(authSessions.isActive).not.toHaveBeenCalled();
            expect(request.auth).toBeUndefined();
        });

        it('should authorize a new token carrying the current version after a password reset', async () => {
            const currentVersion = payload.authVersion + 1;
            jwtService.verifyAsync.mockResolvedValue({ ...payload, authVersion: currentVersion });

            await expect(guard.canActivate(context)).resolves.toBe(true);

            expect(authSessions.isActive).toHaveBeenCalledExactlyOnceWith(sessionId, userId, currentVersion);
            expect(request.auth).toEqual({ userId, authVersion: currentVersion, sessionId });
        });

        it('should propagate an authentication lookup outage without authorizing the request', async () => {
            const error = new Error('Database unavailable');
            authSessions.isActive.mockRejectedValue(error);

            await expect(guard.canActivate(context)).rejects.toBe(error);

            expect(request.auth).toBeUndefined();
        });
    });
});
