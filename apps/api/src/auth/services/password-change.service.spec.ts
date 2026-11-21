import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import {
    authenticationUser,
    credentials,
    publicUser,
    sessionCredentials,
    transaction,
    user,
} from '../../../test/fixtures/auth-users.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS } from '../constants/auth-errors.js';
import { PasswordResetRepository } from '../repositories/password-reset.repository.js';
import { AuthSessionService } from './auth-session.service.js';
import { PasswordService } from './password.service.js';
import { PasswordChangeService } from './password-change.service.js';
import { PasswordNotificationService } from './password-notification.service.js';

describe('PasswordChangeService', () => {
    let service: PasswordChangeService;

    const usersService = {
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
    const authSessions = { create: vi.fn<AuthSessionService['create']>() };
    const prisma = {
        $transaction: vi.fn(async <T>(operation: (client: Prisma.TransactionClient) => Promise<T>) =>
            operation(transaction)),
    };
    const resets = {
        deleteForUser: vi.fn<(
            ...args: Parameters<PasswordResetRepository['deleteForUser']>
        ) => Promise<Awaited<ReturnType<PasswordResetRepository['deleteForUser']>>>>(),
    };
    const notifications = { passwordChanged: vi.fn<PasswordNotificationService['passwordChanged']>() };

    beforeEach(async () => {
        vi.resetAllMocks();
        usersService.findPasswordById.mockResolvedValue({ ...authenticationUser, passwordHash: user.passwordHash });
        usersService.changePasswordIfCurrent.mockResolvedValue(true);
        resets.deleteForUser.mockResolvedValue({ count: 1 });
        passwordService.hash.mockResolvedValue('unused-password-hash');
        passwordService.verify.mockResolvedValue(true);
        authSessions.create.mockResolvedValue({ ...sessionCredentials, user: publicUser });

        const module = await Test.createTestingModule({
            providers: [
                PasswordChangeService,
                { provide: PrismaService, useValue: prisma },
                { provide: UsersService, useValue: usersService },
                { provide: PasswordService, useValue: passwordService },
                { provide: PasswordResetRepository, useValue: resets },
                { provide: AuthSessionService, useValue: authSessions },
                { provide: PasswordNotificationService, useValue: notifications },
            ],
        }).compile();

        service = module.get(PasswordChangeService);
    });

    describe('changePassword', () => {
        const data = { currentPassword: credentials.password, password: 'NewPassword123!' };
        const updatedUser = { ...authenticationUser, authVersion: user.authVersion + 1 };

        beforeEach(() => usersService.findAuthenticationById.mockResolvedValue(updatedUser));

        it('should verify the current password and create a replacement session in the transaction', async () => {
            await expect(service.changePassword(user.id, user.authVersion, data)).resolves.toEqual({
                ...sessionCredentials,
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
            expect(authSessions.create).toHaveBeenCalledExactlyOnceWith(updatedUser, transaction);
            expect(usersService.findAuthenticationById).toHaveBeenCalledBefore(authSessions.create);
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
            expect(authSessions.create).not.toHaveBeenCalled();
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
            expect(authSessions.create).not.toHaveBeenCalled();
            expect(notifications.passwordChanged).not.toHaveBeenCalled();
        });

        it('should wait for the transaction to commit before notifying', async () => {
            let commit!: () => void;
            const pending = new Promise<void>((resolve) => { commit = resolve; });
            prisma.$transaction.mockImplementationOnce(async (operation) => {
                const result = await operation(transaction);
                await pending;
                return result;
            });

            const change = service.changePassword(user.id, user.authVersion, data);
            try {
                await vi.waitFor(() => expect(authSessions.create).toHaveBeenCalledOnce());
                expect(notifications.passwordChanged).not.toHaveBeenCalled();
            } finally {
                commit();
                await change;
            }
            expect(notifications.passwordChanged).toHaveBeenCalledOnce();
        });

        it('should propagate a failed transaction without creating false success notifications', async () => {
            const error = new Error('Database unavailable');
            resets.deleteForUser.mockRejectedValue(error);

            await expect(service.changePassword(user.id, user.authVersion, data)).rejects.toBe(error);

            expect(usersService.changePasswordIfCurrent).not.toHaveBeenCalled();
            expect(authSessions.create).not.toHaveBeenCalled();
            expect(notifications.passwordChanged).not.toHaveBeenCalled();
        });
    });
});
