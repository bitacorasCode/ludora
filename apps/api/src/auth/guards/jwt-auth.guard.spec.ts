import { HttpStatus } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS } from '../constants/auth-errors.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
    let guard: JwtAuthGuard;
    let request: AuthenticatedRequest;
    let context: ExecutionContextHost;

    const token = 'signed-access-token';
    const userId = 'a0db3414-7659-46ee-8435-1a32f52b1f26';
    const payload = { sub: userId, exp: 1_793_793_600, authVersion: 0 };
    const user = {
        id: userId,
        nickname: 'player',
        email: 'player@example.com',
        createdAt: new Date('2026-11-04T12:00:00.000Z'),
        emailVerifiedAt: new Date('2026-11-04T12:00:00.000Z'),
        authVersion: payload.authVersion,
    };
    const jwtService = {
        verifyAsync: vi.fn<(...args: Parameters<JwtService['verifyAsync']>) => Promise<unknown>>(),
    };
    const usersService = {
        findAuthenticationById: vi.fn<(
            ...args: Parameters<UsersService['findAuthenticationById']>
        ) => Promise<Awaited<ReturnType<UsersService['findAuthenticationById']>>>>(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        jwtService.verifyAsync.mockResolvedValue(payload);
        usersService.findAuthenticationById.mockResolvedValue(user);
        request = { headers: { authorization: `Bearer ${token}` } } as AuthenticatedRequest;
        context = new ExecutionContextHost([request]);

        const module = await Test.createTestingModule({
            providers: [
                { provide: JwtService, useValue: jwtService },
                { provide: UsersService, useValue: usersService },
                {
                    provide: JwtAuthGuard,
                    inject: [JwtService, UsersService],
                    useFactory: (jwt: JwtService, users: UsersService) => new JwtAuthGuard(jwt, users),
                },
            ],
        }).compile();
        guard = module.get(JwtAuthGuard);
    });

    describe('canActivate', () => {
        it('should verify the JWT and current version before attaching the user identifier', async () => {
            await expect(guard.canActivate(context)).resolves.toBe(true);

            expect(jwtService.verifyAsync).toHaveBeenCalledExactlyOnceWith(token);
            expect(usersService.findAuthenticationById).toHaveBeenCalledExactlyOnceWith(userId);
            expect(jwtService.verifyAsync).toHaveBeenCalledBefore(usersService.findAuthenticationById);
            expect(request.auth).toEqual({ userId });
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
                expect(usersService.findAuthenticationById).not.toHaveBeenCalled();
                expect(request.auth).toBeUndefined();
            },
        );

        it('should reject an invalid or expired JWT before querying user state', async () => {
            jwtService.verifyAsync.mockRejectedValue(new Error('JWT has expired'));

            await expect(guard.canActivate(context)).rejects.toMatchObject({
                status: HttpStatus.UNAUTHORIZED,
                response: AUTH_ERRORS.invalidToken,
            });

            expect(usersService.findAuthenticationById).not.toHaveBeenCalled();
            expect(request.auth).toBeUndefined();
        });

        it.each([
            null,
            {},
            { sub: userId, exp: payload.exp },
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

            expect(usersService.findAuthenticationById).not.toHaveBeenCalled();
            expect(request.auth).toBeUndefined();
        });

        it.each([
            ['deleted', null],
            ['unverified', { ...user, emailVerifiedAt: null }],
            ['revoked', { ...user, authVersion: payload.authVersion + 1 }],
        ] as const)('should reject a %s user session', async (_label, currentUser) => {
            usersService.findAuthenticationById.mockResolvedValue(currentUser);

            await expect(guard.canActivate(context)).rejects.toMatchObject({
                status: HttpStatus.UNAUTHORIZED,
                response: AUTH_ERRORS.invalidToken,
            });

            expect(request.auth).toBeUndefined();
        });

        it('should read the current version on each request instead of reusing previous authorization', async () => {
            await expect(guard.canActivate(context)).resolves.toBe(true);
            usersService.findAuthenticationById.mockResolvedValue({ ...user, authVersion: user.authVersion + 1 });
            const nextRequest = { headers: { authorization: `Bearer ${token}` } } as AuthenticatedRequest;

            await expect(guard.canActivate(new ExecutionContextHost([nextRequest]))).rejects.toMatchObject({
                status: HttpStatus.UNAUTHORIZED,
                response: AUTH_ERRORS.invalidToken,
            });

            expect(usersService.findAuthenticationById).toHaveBeenCalledTimes(2);
            expect(nextRequest.auth).toBeUndefined();
        });

        it('should authorize a new token carrying the current version after a password reset', async () => {
            const currentVersion = user.authVersion + 1;
            jwtService.verifyAsync.mockResolvedValue({ ...payload, authVersion: currentVersion });
            usersService.findAuthenticationById.mockResolvedValue({ ...user, authVersion: currentVersion });

            await expect(guard.canActivate(context)).resolves.toBe(true);

            expect(request.auth).toEqual({ userId });
        });

        it('should propagate an authentication lookup outage without authorizing the request', async () => {
            const error = new Error('Database unavailable');
            usersService.findAuthenticationById.mockRejectedValue(error);

            await expect(guard.canActivate(context)).rejects.toBe(error);

            expect(request.auth).toBeUndefined();
        });
    });
});
