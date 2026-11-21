import { AUTH_NEXT_STEP } from '@ludora/security';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import {
    authenticationUser,
    credentials,
    publicUser,
    sessionCredentials,
    transaction,
    user,
    verification,
} from '../../../test/fixtures/auth-users.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS } from '../constants/auth-errors.js';
import { AuthService } from './auth.service.js';
import { AuthSessionService } from './auth-session.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { PasswordService } from './password.service.js';

describe('AuthService', () => {
    let service: AuthService;

    const usersService = {
        findByEmail: vi.fn<UsersService['findByEmail']>(),
        findCurrentById: vi.fn<(
            ...args: Parameters<UsersService['findCurrentById']>
        ) => Promise<Awaited<ReturnType<UsersService['findCurrentById']>>>>(),
        findAuthenticationById: vi.fn<(
            ...args: Parameters<UsersService['findAuthenticationById']>
        ) => Promise<Awaited<ReturnType<UsersService['findAuthenticationById']>>>>(),
    };
    const passwordService = {
        hash: vi.fn<PasswordService['hash']>(),
        verify: vi.fn<PasswordService['verify']>(),
    };
    const authSessions = { create: vi.fn<AuthSessionService['create']>() };
    const verificationService = {
        getPending: vi.fn<EmailVerificationService['getPending']>(),
        confirm: vi.fn<EmailVerificationService['confirm']>(),
        resend: vi.fn<EmailVerificationService['resend']>(),
        create: vi.fn<EmailVerificationService['create']>(),
        send: vi.fn<EmailVerificationService['send']>(),
    };
    const prisma = {
        $transaction: vi.fn(async <T>(operation: (client: Prisma.TransactionClient) => Promise<T>) =>
            operation(transaction)),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        usersService.findByEmail.mockResolvedValue(user);
        usersService.findCurrentById.mockResolvedValue({ ...publicUser, profile: null, passwordHash: user.passwordHash });
        usersService.findAuthenticationById.mockResolvedValue(authenticationUser);
        passwordService.hash.mockResolvedValue('unused-password-hash');
        passwordService.verify.mockResolvedValue(true);
        authSessions.create.mockResolvedValue({ ...sessionCredentials, user: publicUser });
        verificationService.getPending.mockResolvedValue(verification);
        verificationService.confirm.mockResolvedValue(user.id);

        const module = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UsersService, useValue: usersService },
                { provide: PasswordService, useValue: passwordService },
                { provide: AuthSessionService, useValue: authSessions },
                { provide: PrismaService, useValue: prisma },
                { provide: EmailVerificationService, useValue: verificationService },
            ],
        }).compile();

        service = module.get(AuthService);
    });

    describe('login', () => {
        it('should return the pending verification without creating a session or resetting its code', async () => {
            const result = await service.login(credentials);

            expect(result).toEqual({ nextStep: AUTH_NEXT_STEP.verifyEmail, verification });
            expect(usersService.findByEmail).toHaveBeenCalledWith(credentials.email);
            expect(passwordService.verify).toHaveBeenCalledWith(user.passwordHash, credentials.password);
            expect(verificationService.getPending).toHaveBeenCalledWith(user.id);
            expect(result).not.toHaveProperty('accessToken');
            expect(result).not.toHaveProperty('user');
            expect(authSessions.create).not.toHaveBeenCalled();
            expect(verificationService.create).not.toHaveBeenCalled();
            expect(verificationService.resend).not.toHaveBeenCalled();
            expect(verificationService.send).not.toHaveBeenCalled();
        });

        it('should reject an incorrect password before exposing pending verification', async () => {
            passwordService.verify.mockResolvedValue(false);

            await expect(service.login(credentials)).rejects.toMatchObject({
                status: 401,
                response: AUTH_ERRORS.invalidCredentials,
            });

            expect(verificationService.getPending).not.toHaveBeenCalled();
            expect(authSessions.create).not.toHaveBeenCalled();
        });

        it.each([null, { ...user, passwordHash: null }])('should reject unavailable password credentials generically and perform dummy hashing', async (account) => {
            usersService.findByEmail.mockResolvedValue(account);

            await expect(service.login(credentials)).rejects.toMatchObject({
                status: 401,
                response: AUTH_ERRORS.invalidCredentials,
            });

            expect(passwordService.hash).toHaveBeenCalledWith(credentials.password);
            expect(passwordService.verify).not.toHaveBeenCalled();
            expect(verificationService.getPending).not.toHaveBeenCalled();
            expect(authSessions.create).not.toHaveBeenCalled();
        });

        it('should authenticate a verified user and return only public user fields', async () => {
            usersService.findByEmail.mockResolvedValue({ ...user, emailVerifiedAt: user.createdAt });

            await expect(service.login(credentials)).resolves.toEqual({
                nextStep: AUTH_NEXT_STEP.authenticated,
                ...sessionCredentials,
                user: publicUser,
            });

            expect(authSessions.create).toHaveBeenCalledExactlyOnceWith(
                expect.objectContaining({ id: user.id, authVersion: user.authVersion }),
            );
            expect(verificationService.getPending).not.toHaveBeenCalled();
        });

        it('should reject an unverified user whose verification context is unavailable', async () => {
            verificationService.getPending.mockResolvedValue(null);

            await expect(service.login(credentials)).rejects.toMatchObject({
                status: 403,
                response: AUTH_ERRORS.emailNotVerified,
            });

            expect(authSessions.create).not.toHaveBeenCalled();
            expect(verificationService.create).not.toHaveBeenCalled();
            expect(verificationService.send).not.toHaveBeenCalled();
        });
    });

    describe('verifyEmail', () => {
        it('should confirm the code and load the user before issuing a JWT', async () => {
            verificationService.confirm.mockImplementation(async () => {
                await Promise.resolve();
                expect(usersService.findAuthenticationById).not.toHaveBeenCalled();
                expect(authSessions.create).not.toHaveBeenCalled();
                return user.id;
            });
            usersService.findAuthenticationById.mockImplementation(async () => {
                await Promise.resolve();
                expect(authSessions.create).not.toHaveBeenCalled();
                return authenticationUser;
            });

            await expect(service.verifyEmail({ verificationId: verification.id, code: '123456' })).resolves.toEqual({
                ...sessionCredentials,
                user: publicUser,
            });

            expect(verificationService.confirm).toHaveBeenCalledWith(verification.id, '123456');
            expect(usersService.findAuthenticationById).toHaveBeenCalledWith(user.id);
            expect(verificationService.confirm).toHaveBeenCalledBefore(usersService.findAuthenticationById);
            expect(usersService.findAuthenticationById).toHaveBeenCalledBefore(authSessions.create);
            expect(authSessions.create).toHaveBeenCalledExactlyOnceWith(
                expect.objectContaining({ id: user.id, authVersion: user.authVersion }),
            );
        });

        it('should propagate a rejected code without looking up the user or creating a JWT', async () => {
            const error = new BadRequestException(AUTH_ERRORS.emailVerificationCodeInvalid.message, {
                errorCode: AUTH_ERRORS.emailVerificationCodeInvalid.errorCode,
            });
            verificationService.confirm.mockRejectedValue(error);

            await expect(service.verifyEmail({ verificationId: verification.id, code: '999999' })).rejects.toBe(error);

            expect(usersService.findAuthenticationById).not.toHaveBeenCalled();
            expect(authSessions.create).not.toHaveBeenCalled();
        });

        it('should not issue a JWT when the user no longer exists after confirmation', async () => {
            usersService.findAuthenticationById.mockResolvedValue(null);

            await expect(service.verifyEmail({ verificationId: verification.id, code: '123456' })).rejects.toMatchObject({
                status: 401,
                response: AUTH_ERRORS.authenticationRequired,
            });

            expect(authSessions.create).not.toHaveBeenCalled();
        });
    });

    describe('resendVerification', () => {
        it('should delegate resending to email verification without issuing a JWT', async () => {
            const result = { verification: { ...verification, emailSent: true } };
            verificationService.resend.mockResolvedValue(result);

            await expect(service.resendVerification({ verificationId: verification.id })).resolves.toEqual(result);

            expect(verificationService.resend).toHaveBeenCalledExactlyOnceWith(verification.id);
            expect(authSessions.create).not.toHaveBeenCalled();
        });
    });

    describe('getCurrentUser', () => {
        it.each([
            { profile: null, passwordHash: user.passwordHash, hasPassword: true },
            { profile: { avatarPresetId: 'fox' }, passwordHash: user.passwordHash, hasPassword: true },
            { profile: null, passwordHash: null, hasPassword: false },
        ])('returns password capability and avatar without exposing the hash: %j', async ({ profile, passwordHash, hasPassword }) => {
            usersService.findCurrentById.mockResolvedValue({ ...publicUser, profile, passwordHash });

            await expect(service.getCurrentUser(user.id)).resolves.toEqual({
                user: { ...publicUser, avatarPresetId: profile?.avatarPresetId ?? null, hasPassword },
            });

            expect(usersService.findCurrentById).toHaveBeenCalledExactlyOnceWith(user.id);
        });

        it('should reject a user deleted after guard authorization', async () => {
            usersService.findCurrentById.mockResolvedValue(null);

            await expect(service.getCurrentUser(user.id)).rejects.toMatchObject({
                status: 401,
                response: AUTH_ERRORS.authenticationRequired,
            });
        });
    });
});
