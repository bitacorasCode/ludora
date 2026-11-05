import { setImmediate as settleBackgroundTasks } from 'node:timers/promises';

import { HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { MILLISECONDS_PER_SECOND } from '../../common/constants/time.js';
import type { Prisma, User } from '../../generated/prisma/client.js';
import { MailService } from '../../mail/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS } from '../constants/auth-errors.js';
import { PASSWORD_RESET_CONFIG } from '../constants/password-reset.js';
import { PasswordResetRepository } from '../repositories/password-reset.repository.js';
import { createPasswordChangedMail } from '../templates/password-changed-mail.js';
import { PasswordService } from './password.service.js';
import { PasswordRecoveryService } from './password-recovery.service.js';
import { PasswordResetTokenService } from './password-reset-token.service.js';

const scheduled = vi.hoisted(() => ({ tasks: [] as (() => void)[] }));

vi.mock('node:timers', () => ({
    setImmediate: vi.fn((callback: () => void) => {
        scheduled.tasks.push(callback);
    }),
}));

describe('PasswordRecoveryService', () => {
    let service: PasswordRecoveryService;
    let events: string[];

    const now = new Date('2026-11-04T12:00:00.000Z');
    const resetUrl = 'https://ludora.example/reset-password';
    const token = 'temporary-reset-token';
    const tokenHash = 'stored-token-hash';
    const newPassword = 'NewPassword123!';
    const newPasswordHash = 'new-password-hash';
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_CONFIG.expiresInSeconds * MILLISECONDS_PER_SECOND);
    const user: User = {
        id: 'a0db3414-7659-46ee-8435-1a32f52b1f26',
        nickname: 'player',
        email: 'player@example.com',
        passwordHash: 'previous-password-hash',
        authVersion: 0,
        emailVerifiedAt: now,
        createdAt: now,
        updatedAt: now,
    };
    // The callback token models transaction propagation, not database rollback.
    const transaction = {} as Prisma.TransactionClient;
    const prisma = {
        $transaction: vi.fn(async <T>(operation: (client: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
            events.push('transaction:start');
            try {
                const result = await operation(transaction);
                events.push('transaction:resolved');
                return result;
            } catch (error) {
                events.push('transaction:rejected');
                throw error;
            }
        }),
    };
    const usersService = {
        findByEmail: vi.fn<UsersService['findByEmail']>(),
        updatePassword: vi.fn<UsersService['updatePassword']>(),
    };
    const tokenService = {
        create: vi.fn<PasswordResetTokenService['create']>(),
        hash: vi.fn<PasswordResetTokenService['hash']>(),
    };
    const repository = {
        reserveRequest: vi.fn<PasswordResetRepository['reserveRequest']>(),
        findByTokenHash: vi.fn<PasswordResetRepository['findByTokenHash']>(),
        consume: vi.fn<PasswordResetRepository['consume']>(),
    };
    const mailService = { send: vi.fn<MailService['send']>() };
    const passwordService = { hash: vi.fn<PasswordService['hash']>() };

    async function runBackgroundTasks() {
        for (const task of scheduled.tasks.splice(0)) task();
        await settleBackgroundTasks();
    }

    function createDeferredCompletion() {
        let resolve!: () => void;
        const promise = new Promise<void>((complete) => { resolve = complete; });
        return { promise, resolve };
    }

    beforeEach(async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(now);
        scheduled.tasks = [];
        events = [];
        prisma.$transaction.mockClear();
        for (const dependency of [usersService, tokenService, repository, mailService, passwordService]) {
            for (const method of Object.values(dependency)) method.mockReset();
        }
        vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

        usersService.findByEmail.mockResolvedValue(user);
        usersService.updatePassword.mockResolvedValue({ id: user.id, email: user.email });
        tokenService.create.mockReturnValue({ token, tokenHash, expiresAt });
        tokenService.hash.mockReturnValue(tokenHash);
        repository.reserveRequest.mockResolvedValue(true);
        repository.findByTokenHash.mockResolvedValue({ userId: user.id, expiresAt });
        repository.consume.mockResolvedValue(true);
        passwordService.hash.mockImplementation(async () => {
            events.push('password:hash');
            return newPasswordHash;
        });
        mailService.send.mockImplementation(async () => { events.push('mail:send'); });

        const module = await Test.createTestingModule({
            providers: [
                { provide: ConfigService, useValue: new ConfigService({ NODE_ENV: 'test', PASSWORD_RESET_URL: resetUrl }) },
                { provide: PrismaService, useValue: prisma },
                { provide: UsersService, useValue: usersService },
                { provide: PasswordResetTokenService, useValue: tokenService },
                { provide: PasswordResetRepository, useValue: repository },
                { provide: MailService, useValue: mailService },
                { provide: PasswordService, useValue: passwordService },
                {
                    provide: PasswordRecoveryService,
                    inject: [ConfigService, PrismaService, UsersService, PasswordResetTokenService, PasswordResetRepository, MailService, PasswordService],
                    useFactory: (
                        config: ConfigService,
                        database: PrismaService,
                        users: UsersService,
                        tokens: PasswordResetTokenService,
                        resets: PasswordResetRepository,
                        mail: MailService,
                        passwords: PasswordService,
                    ) => new PasswordRecoveryService(config, database, users, tokens, resets, mail, passwords),
                },
            ],
        }).compile();
        service = module.get(PasswordRecoveryService);
    });

    afterEach(() => {
        scheduled.tasks = [];
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('request', () => {
        it('should return before looking up the account or contacting SMTP', async () => {
            expect(service.request(user.email)).toBeUndefined();
            expect(usersService.findByEmail).not.toHaveBeenCalled();
            expect(mailService.send).not.toHaveBeenCalled();
            expect(scheduled.tasks).toHaveLength(1);

            await runBackgroundTasks();

            expect(usersService.findByEmail).toHaveBeenCalledExactlyOnceWith(user.email);
        });

        it('should ignore unknown accounts without creating a request or sending mail', async () => {
            usersService.findByEmail.mockResolvedValue(null);

            expect(service.request(user.email)).toBeUndefined();
            await runBackgroundTasks();

            expect(tokenService.create).not.toHaveBeenCalled();
            expect(prisma.$transaction).not.toHaveBeenCalled();
            expect(repository.reserveRequest).not.toHaveBeenCalled();
            expect(mailService.send).not.toHaveBeenCalled();
        });

        it('should reserve the token before sending an English link from trusted configuration', async () => {
            service.request(user.email);
            await runBackgroundTasks();

            expect(repository.reserveRequest).toHaveBeenCalledExactlyOnceWith({
                userId: user.id,
                tokenHash,
                expiresAt,
                lastSentAt: now,
                requestBefore: new Date(now.getTime() - PASSWORD_RESET_CONFIG.requestCooldownSeconds * MILLISECONDS_PER_SECOND),
            }, transaction);
            expect(events).toEqual(['transaction:start', 'transaction:resolved', 'mail:send']);
            const [mail] = mailService.send.mock.calls[0];
            expect(mail.to).toBe(user.email);
            expect(mail.subject).toBe('Reset your Ludora password');
            expect(mail.text).toContain(`${resetUrl}?token=${token}`);
            expect(mail.text).not.toContain(tokenHash);
            expect(mail.text).not.toContain(user.passwordHash);
        });

        it('should preserve the account cooldown without sending another link', async () => {
            repository.reserveRequest.mockResolvedValue(false);

            service.request(user.email);
            await runBackgroundTasks();

            expect(repository.reserveRequest).toHaveBeenCalledOnce();
            expect(mailService.send).not.toHaveBeenCalled();
            expect(events).toEqual(['transaction:start', 'transaction:resolved']);
        });

        it('should not send a link when request reservation fails', async () => {
            repository.reserveRequest.mockRejectedValue(new Error('Database failure'));

            service.request(user.email);
            await runBackgroundTasks();

            expect(mailService.send).not.toHaveBeenCalled();
            expect(Logger.prototype.error).toHaveBeenCalledExactlyOnceWith('Could not process password recovery request.');
        });

        it('should log SMTP failure without exposing the email, token, or password', async () => {
            mailService.send.mockRejectedValue(new Error(`SMTP failure for ${user.email}: ${token}`));

            expect(service.request(user.email)).toBeUndefined();
            await runBackgroundTasks();

            expect(Logger.prototype.error).toHaveBeenCalledExactlyOnceWith('Could not process password recovery request.');
            expect(repository.reserveRequest).toHaveBeenCalledOnce();
            expect(prisma.$transaction).toHaveBeenCalledOnce();
        });
    });

    describe('reset', () => {
        it.each([
            ['missing', null],
            ['expired', { userId: user.id, expiresAt: new Date(now.getTime() - MILLISECONDS_PER_SECOND) }],
            ['at the expiration deadline', { userId: user.id, expiresAt: now }],
        ] as const)('should reject a %s link before hashing the password', async (_label, reset) => {
            repository.findByTokenHash.mockResolvedValue(reset);

            await expect(service.reset(token, newPassword)).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
                response: AUTH_ERRORS.passwordResetInvalid,
            });

            expect(tokenService.hash).toHaveBeenCalledExactlyOnceWith(token);
            expect(passwordService.hash).not.toHaveBeenCalled();
            expect(prisma.$transaction).not.toHaveBeenCalled();
            expect(scheduled.tasks).toHaveLength(0);
        });

        it('should hash outside the transaction and use the same transaction for consumption and update', async () => {
            await expect(service.reset(token, newPassword)).resolves.toBeUndefined();

            expect(passwordService.hash).toHaveBeenCalledExactlyOnceWith(newPassword);
            expect(repository.consume).toHaveBeenCalledExactlyOnceWith({ tokenHash, now }, transaction);
            expect(usersService.updatePassword).toHaveBeenCalledExactlyOnceWith(user.id, newPasswordHash, transaction);
            expect(repository.consume).toHaveBeenCalledBefore(usersService.updatePassword);
            expect(events).toEqual(['password:hash', 'transaction:start', 'transaction:resolved']);
            expect(mailService.send).not.toHaveBeenCalled();
            expect(scheduled.tasks).toHaveLength(1);

            await runBackgroundTasks();

            expect(events).toEqual(['password:hash', 'transaction:start', 'transaction:resolved', 'mail:send']);
        });

        it('should capture a fresh expiration check after hashing finishes', async () => {
            const afterHash = new Date(expiresAt.getTime() + MILLISECONDS_PER_SECOND);
            passwordService.hash.mockImplementation(async () => {
                vi.setSystemTime(afterHash);
                return newPasswordHash;
            });
            repository.consume.mockResolvedValue(false);

            await expect(service.reset(token, newPassword)).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
                response: AUTH_ERRORS.passwordResetInvalid,
            });

            expect(repository.consume).toHaveBeenCalledExactlyOnceWith({ tokenHash, now: afterHash }, transaction);
            expect(usersService.updatePassword).not.toHaveBeenCalled();
            expect(scheduled.tasks).toHaveLength(0);
        });

        it('should reject a token already consumed or renewed by a concurrent operation', async () => {
            repository.consume.mockResolvedValue(false);

            await expect(service.reset(token, newPassword)).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
                response: AUTH_ERRORS.passwordResetInvalid,
            });

            expect(usersService.updatePassword).not.toHaveBeenCalled();
            expect(scheduled.tasks).toHaveLength(0);
            expect(mailService.send).not.toHaveBeenCalled();
            expect(events).toEqual(['password:hash', 'transaction:start', 'transaction:rejected']);
        });

        it('should propagate a hashing failure without consuming the token', async () => {
            const error = new Error('Password hashing failed');
            passwordService.hash.mockRejectedValue(error);

            await expect(service.reset(token, newPassword)).rejects.toBe(error);

            expect(prisma.$transaction).not.toHaveBeenCalled();
            expect(repository.consume).not.toHaveBeenCalled();
            expect(scheduled.tasks).toHaveLength(0);
        });

        it('should propagate an update failure without scheduling a false success notice', async () => {
            const error = new Error('Password update failed');
            usersService.updatePassword.mockRejectedValue(error);

            await expect(service.reset(token, newPassword)).rejects.toBe(error);

            expect(repository.consume).toHaveBeenCalledWith({ tokenHash, now }, transaction);
            expect(events).toEqual(['password:hash', 'transaction:start', 'transaction:rejected']);
            expect(scheduled.tasks).toHaveLength(0);
            expect(mailService.send).not.toHaveBeenCalled();
        });

        it('should wait for transaction resolution before scheduling the notice', async () => {
            const commit = createDeferredCompletion();
            prisma.$transaction.mockImplementationOnce(async (operation) => {
                const result = await operation(transaction);
                await commit.promise;
                return result;
            });

            const reset = service.reset(token, newPassword);
            await settleBackgroundTasks();

            expect(usersService.updatePassword).toHaveBeenCalledOnce();
            expect(scheduled.tasks).toHaveLength(0);
            expect(mailService.send).not.toHaveBeenCalled();

            commit.resolve();
            await reset;

            expect(scheduled.tasks).toHaveLength(1);
        });

        it('should send the notice to the recipient returned by the password update', async () => {
            const recipient = 'current-address@example.com';
            usersService.updatePassword.mockResolvedValue({ id: user.id, email: recipient });

            await service.reset(token, newPassword);
            await runBackgroundTasks();

            expect(mailService.send).toHaveBeenCalledExactlyOnceWith({ to: recipient, ...createPasswordChangedMail() });
            expect(usersService.findByEmail).not.toHaveBeenCalled();
            const [mail] = mailService.send.mock.calls[0];
            for (const secret of [token, tokenHash, newPassword, newPasswordHash, user.passwordHash]) {
                expect(mail.text).not.toContain(secret);
            }
        });

        it('should finish reset without waiting for pending SMTP delivery', async () => {
            const delivery = createDeferredCompletion();
            mailService.send.mockReturnValue(delivery.promise);

            await expect(service.reset(token, newPassword)).resolves.toBeUndefined();
            await runBackgroundTasks();

            expect(mailService.send).toHaveBeenCalledOnce();
            delivery.resolve();
            await settleBackgroundTasks();
        });

        it('should log notification failure without changing the successful reset result', async () => {
            mailService.send.mockRejectedValue(new Error(`SMTP failure: ${user.email} ${token} ${newPassword}`));

            await expect(service.reset(token, newPassword)).resolves.toBeUndefined();
            await runBackgroundTasks();

            expect(Logger.prototype.error).toHaveBeenCalledExactlyOnceWith('Could not send password change notification.');
            expect(prisma.$transaction).toHaveBeenCalledOnce();
            expect(usersService.updatePassword).toHaveBeenCalledOnce();
        });
    });
});
