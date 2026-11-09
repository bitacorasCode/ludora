import { AUTH_NEXT_STEP } from '@ludora/security';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import type { Prisma, User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS } from '../constants/auth-errors.js';
import { PasswordResetRepository } from '../repositories/password-reset.repository.js';
import { AuthService } from './auth.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { PasswordService } from './password.service.js';
import { PasswordNotificationService } from './password-notification.service.js';

describe('AuthService', () => {
    let service: AuthService;

    const credentials = { email: 'player@example.com', password: 'Password123!' };
    const user: User = {
        id: 'a0db3414-7659-46ee-8435-1a32f52b1f26',
        nickname: 'player',
        email: credentials.email,
        passwordHash: 'stored-password-hash',
        authVersion: 0,
        emailVerifiedAt: null,
        createdAt: new Date('2026-10-20T12:00:00.000Z'),
        updatedAt: new Date('2026-10-20T12:00:00.000Z'),
    };
    const publicUser = {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        createdAt: user.createdAt,
    };
    const authenticationUser = {
        ...publicUser,
        authVersion: user.authVersion,
        emailVerifiedAt: user.createdAt,
    };
    const verification = {
        id: '25f2ce15-8c54-46b2-96f8-cdd77889ac6f',
        expiresAt: new Date('2026-10-20T12:10:00.000Z'),
        resendAvailableAt: new Date('2026-10-20T12:01:00.000Z'),
    };
    const usersService = {
        findByEmail: vi.fn<UsersService['findByEmail']>(),
        findById: vi.fn<(
            ...args: Parameters<UsersService['findById']>
        ) => Promise<Awaited<ReturnType<UsersService['findById']>>>>(),
        findCurrentById: vi.fn<(
            ...args: Parameters<UsersService['findCurrentById']>
        ) => Promise<Awaited<ReturnType<UsersService['findCurrentById']>>>>(),
        findPasswordById: vi.fn<(
            ...args: Parameters<UsersService['findPasswordById']>
        ) => Promise<Awaited<ReturnType<UsersService['findPasswordById']>>>>(),
        changePasswordIfCurrent: vi.fn<UsersService['changePasswordIfCurrent']>(),
        findAuthenticationById: vi.fn<(
            ...args: Parameters<UsersService['findAuthenticationById']>
        ) => Promise<Awaited<ReturnType<UsersService['findAuthenticationById']>>>>(),
    };
    const passwordService = {
        hash: vi.fn<PasswordService['hash']>(),
        verify: vi.fn<PasswordService['verify']>(),
    };
    const jwtService = { signAsync: vi.fn<JwtService['signAsync']>() };
    const transaction = {} as Prisma.TransactionClient;
    const prisma = {
        $transaction: vi.fn(async <T>(operation: (client: Prisma.TransactionClient) => Promise<T>) => operation(transaction)),
    };
    const resets = {
        deleteForUser: vi.fn<(
            ...args: Parameters<PasswordResetRepository['deleteForUser']>
        ) => Promise<Awaited<ReturnType<PasswordResetRepository['deleteForUser']>>>>(),
    };
    const notifications = { passwordChanged: vi.fn<PasswordNotificationService['passwordChanged']>() };
    const verificationService = {
        getPending: vi.fn<EmailVerificationService['getPending']>(),
        confirm: vi.fn<EmailVerificationService['confirm']>(),
        resend: vi.fn<EmailVerificationService['resend']>(),
        create: vi.fn<EmailVerificationService['create']>(),
        send: vi.fn<EmailVerificationService['send']>(),
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        usersService.findByEmail.mockResolvedValue(user);
        usersService.findById.mockResolvedValue(publicUser);
        usersService.findCurrentById.mockResolvedValue({ ...publicUser, profile: null });
        usersService.findPasswordById.mockResolvedValue({ ...authenticationUser, passwordHash: user.passwordHash });
        usersService.changePasswordIfCurrent.mockResolvedValue(true);
        usersService.findAuthenticationById.mockResolvedValue(authenticationUser);
        prisma.$transaction.mockImplementation(async (operation) => operation(transaction));
        resets.deleteForUser.mockResolvedValue({ count: 1 });
        passwordService.hash.mockResolvedValue('unused-password-hash');
        passwordService.verify.mockResolvedValue(true);
        jwtService.signAsync.mockResolvedValue('signed-access-token');
        verificationService.getPending.mockResolvedValue(verification);
        verificationService.confirm.mockResolvedValue(user.id);

        const module = await Test.createTestingModule({
            providers: [
                { provide: UsersService, useValue: usersService },
                { provide: PasswordService, useValue: passwordService },
                { provide: JwtService, useValue: jwtService },
                { provide: PrismaService, useValue: prisma },
                { provide: EmailVerificationService, useValue: verificationService },
                { provide: PasswordResetRepository, useValue: resets },
                { provide: PasswordNotificationService, useValue: notifications },
                {
                    provide: AuthService,
                    inject: [UsersService, PasswordService, JwtService, PrismaService, EmailVerificationService, PasswordResetRepository, PasswordNotificationService],
                    useFactory: (
                        users: UsersService,
                        passwords: PasswordService,
                        jwt: JwtService,
                        prisma: PrismaService,
                        emailVerification: EmailVerificationService,
                        resetRepository: PasswordResetRepository,
                        passwordNotifications: PasswordNotificationService,
                    ) => new AuthService(users, passwords, jwt, prisma, emailVerification, resetRepository, passwordNotifications),
                },
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
            expect(jwtService.signAsync).not.toHaveBeenCalled();
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
            expect(jwtService.signAsync).not.toHaveBeenCalled();
        });

        it('should reject an unknown email with the same error and perform dummy hashing', async () => {
            usersService.findByEmail.mockResolvedValue(null);

            await expect(service.login(credentials)).rejects.toMatchObject({
                status: 401,
                response: AUTH_ERRORS.invalidCredentials,
            });

            expect(passwordService.hash).toHaveBeenCalledWith(credentials.password);
            expect(passwordService.verify).not.toHaveBeenCalled();
            expect(verificationService.getPending).not.toHaveBeenCalled();
            expect(jwtService.signAsync).not.toHaveBeenCalled();
        });

        it('should authenticate a verified user and return only public user fields', async () => {
            usersService.findByEmail.mockResolvedValue({ ...user, emailVerifiedAt: user.createdAt });

            await expect(service.login(credentials)).resolves.toEqual({
                nextStep: AUTH_NEXT_STEP.authenticated,
                accessToken: 'signed-access-token',
                user: publicUser,
            });

            expect(jwtService.signAsync).toHaveBeenCalledExactlyOnceWith({
                sub: user.id,
                authVersion: user.authVersion,
            });
            expect(verificationService.getPending).not.toHaveBeenCalled();
        });

        it('should reject an unverified user whose verification context is unavailable', async () => {
            verificationService.getPending.mockResolvedValue(null);

            await expect(service.login(credentials)).rejects.toMatchObject({
                status: 403,
                response: AUTH_ERRORS.emailNotVerified,
            });

            expect(jwtService.signAsync).not.toHaveBeenCalled();
            expect(verificationService.create).not.toHaveBeenCalled();
            expect(verificationService.send).not.toHaveBeenCalled();
        });
    });

    describe('verifyEmail', () => {
        it('should confirm the code and load the user before issuing a JWT', async () => {
            verificationService.confirm.mockImplementation(async () => {
                await Promise.resolve();
                expect(usersService.findAuthenticationById).not.toHaveBeenCalled();
                expect(jwtService.signAsync).not.toHaveBeenCalled();
                return user.id;
            });
            usersService.findAuthenticationById.mockImplementation(async () => {
                await Promise.resolve();
                expect(jwtService.signAsync).not.toHaveBeenCalled();
                return authenticationUser;
            });

            await expect(service.verifyEmail({ verificationId: verification.id, code: '123456' })).resolves.toEqual({
                accessToken: 'signed-access-token',
                user: publicUser,
            });

            expect(verificationService.confirm).toHaveBeenCalledWith(verification.id, '123456');
            expect(usersService.findAuthenticationById).toHaveBeenCalledWith(user.id);
            expect(verificationService.confirm).toHaveBeenCalledBefore(usersService.findAuthenticationById);
            expect(usersService.findAuthenticationById).toHaveBeenCalledBefore(jwtService.signAsync);
            expect(jwtService.signAsync).toHaveBeenCalledExactlyOnceWith({
                sub: user.id,
                authVersion: user.authVersion,
            });
        });

        it('should propagate a rejected code without looking up the user or creating a JWT', async () => {
            const error = new BadRequestException(AUTH_ERRORS.emailVerificationCodeInvalid.message, {
                errorCode: AUTH_ERRORS.emailVerificationCodeInvalid.errorCode,
            });
            verificationService.confirm.mockRejectedValue(error);

            await expect(service.verifyEmail({ verificationId: verification.id, code: '999999' })).rejects.toBe(error);

            expect(usersService.findAuthenticationById).not.toHaveBeenCalled();
            expect(jwtService.signAsync).not.toHaveBeenCalled();
        });

        it('should not issue a JWT when the user no longer exists after confirmation', async () => {
            usersService.findAuthenticationById.mockResolvedValue(null);

            await expect(service.verifyEmail({ verificationId: verification.id, code: '123456' })).rejects.toMatchObject({
                status: 401,
                response: AUTH_ERRORS.authenticationRequired,
            });

            expect(jwtService.signAsync).not.toHaveBeenCalled();
        });
    });

    describe('resendVerification', () => {
        it('should delegate resending to email verification without issuing a JWT', async () => {
            const result = { verification: { ...verification, emailSent: true } };
            verificationService.resend.mockResolvedValue(result);

            await expect(service.resendVerification({ verificationId: verification.id })).resolves.toEqual(result);

            expect(verificationService.resend).toHaveBeenCalledExactlyOnceWith(verification.id);
            expect(jwtService.signAsync).not.toHaveBeenCalled();
        });
    });

    describe('getCurrentUser', () => {
        it.each([null, { avatarPresetId: 'fox' }])('should return public identity with avatar %j', async (profile) => {
            usersService.findCurrentById.mockResolvedValue({ ...publicUser, profile });

            await expect(service.getCurrentUser(user.id)).resolves.toEqual({
                user: { ...publicUser, avatarPresetId: profile?.avatarPresetId ?? null },
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

    describe('changePassword', () => {
        const data = { currentPassword: credentials.password, password: 'NewPassword123!' };
        const updatedUser = { ...authenticationUser, authVersion: user.authVersion + 1 };

        beforeEach(() => usersService.findAuthenticationById.mockResolvedValue(updatedUser));

        it('should verify the current password and commit revocation before issuing a replacement JWT', async () => {
            await expect(service.changePassword(user.id, user.authVersion, data)).resolves.toEqual({
                accessToken: 'signed-access-token',
                user: publicUser,
            });

            expect(passwordService.verify).toHaveBeenCalledExactlyOnceWith(user.passwordHash, data.currentPassword);
            expect(passwordService.hash).toHaveBeenCalledExactlyOnceWith(data.password);
            expect(passwordService.hash).toHaveBeenCalledBefore(prisma.$transaction);
            expect(resets.deleteForUser).toHaveBeenCalledExactlyOnceWith(user.id, transaction);
            expect(usersService.changePasswordIfCurrent).toHaveBeenCalledExactlyOnceWith({
                userId: user.id,
                passwordHash: 'unused-password-hash',
                expectedPasswordHash: user.passwordHash,
                expectedAuthVersion: user.authVersion,
            }, transaction);
            expect(resets.deleteForUser).toHaveBeenCalledBefore(usersService.changePasswordIfCurrent);
            expect(usersService.findAuthenticationById).toHaveBeenCalledExactlyOnceWith(user.id, transaction);
            expect(jwtService.signAsync).toHaveBeenCalledExactlyOnceWith({ sub: user.id, authVersion: updatedUser.authVersion });
            expect(notifications.passwordChanged).toHaveBeenCalledExactlyOnceWith(user.email);
        });

        it('should reject an incorrect current password without invalidating the valid session', async () => {
            passwordService.verify.mockResolvedValue(false);

            await expect(service.changePassword(user.id, user.authVersion, data)).rejects.toMatchObject({
                status: 400,
                response: AUTH_ERRORS.currentPasswordInvalid,
            });

            expect(passwordService.hash).not.toHaveBeenCalled();
            expect(prisma.$transaction).not.toHaveBeenCalled();
            expect(jwtService.signAsync).not.toHaveBeenCalled();
            expect(notifications.passwordChanged).not.toHaveBeenCalled();
        });

        it('should reject a password that has not changed', async () => {
            await expect(service.changePassword(user.id, user.authVersion, {
                ...data,
                password: data.currentPassword,
            })).rejects.toMatchObject({ status: 400, response: AUTH_ERRORS.passwordUnchanged });

            expect(passwordService.hash).not.toHaveBeenCalled();
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it.each([
            ['deleted', null],
            ['unverified', { ...authenticationUser, passwordHash: user.passwordHash, emailVerifiedAt: null }],
            ['revoked', { ...authenticationUser, passwordHash: user.passwordHash, authVersion: user.authVersion + 1 }],
        ] as const)('should recheck a %s session before verifying the current password', async (_label, current) => {
            usersService.findPasswordById.mockResolvedValue(current);

            await expect(service.changePassword(user.id, user.authVersion, data)).rejects.toMatchObject({
                status: 401,
                response: AUTH_ERRORS.invalidToken,
            });

            expect(passwordService.verify).not.toHaveBeenCalled();
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it('should reject a concurrent password change without issuing a JWT or scheduling a notice', async () => {
            usersService.changePasswordIfCurrent.mockResolvedValue(false);

            await expect(service.changePassword(user.id, user.authVersion, data)).rejects.toMatchObject({
                status: 401,
                response: AUTH_ERRORS.invalidToken,
            });

            expect(usersService.findAuthenticationById).not.toHaveBeenCalled();
            expect(jwtService.signAsync).not.toHaveBeenCalled();
            expect(notifications.passwordChanged).not.toHaveBeenCalled();
        });

        it('should not sign or notify before the transaction resolves', async () => {
            let commit!: () => void;
            const pending = new Promise<void>((resolve) => { commit = resolve; });
            prisma.$transaction.mockImplementationOnce(async (operation) => {
                const result = await operation(transaction);
                await pending;
                return result;
            });

            const change = service.changePassword(user.id, user.authVersion, data);
            await vi.waitFor(() => expect(usersService.changePasswordIfCurrent).toHaveBeenCalledOnce());
            expect(jwtService.signAsync).not.toHaveBeenCalled();
            expect(notifications.passwordChanged).not.toHaveBeenCalled();
            commit();
            await change;
            expect(notifications.passwordChanged).toHaveBeenCalledOnce();
        });

        it('should propagate a failed transaction without creating false success notifications', async () => {
            const error = new Error('Database unavailable');
            resets.deleteForUser.mockRejectedValue(error);

            await expect(service.changePassword(user.id, user.authVersion, data)).rejects.toBe(error);

            expect(usersService.changePasswordIfCurrent).not.toHaveBeenCalled();
            expect(jwtService.signAsync).not.toHaveBeenCalled();
            expect(notifications.passwordChanged).not.toHaveBeenCalled();
        });
    });
});
