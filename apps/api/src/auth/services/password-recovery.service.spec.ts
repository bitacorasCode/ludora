import { setImmediate as settleBackgroundTasks } from 'node:timers/promises';

import { PASSWORD_FORM_MODE } from '@ludora/contracts/auth';
import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { MILLISECONDS_PER_SECOND } from '../../common/constants/time.js';
import type { PasswordRecoveryJob, Prisma, User } from '../../generated/prisma/client.js';
import { MailService } from '../../mail/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS } from '../constants/auth-errors.js';
import { PASSWORD_RESET_CONFIG } from '../constants/password-reset.js';
import { PasswordRecoveryJobRepository } from '../repositories/password-recovery-job.repository.js';
import { PasswordResetRepository } from '../repositories/password-reset.repository.js';
import { PasswordService } from './password.service.js';
import { PasswordNotificationService } from './password-notification.service.js';
import { PasswordRecoveryService } from './password-recovery.service.js';
import { PasswordResetTokenService } from './password-reset-token.service.js';

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
    const job: PasswordRecoveryJob = {
        id: 'd56aa89f-ac5f-4d65-a49d-3653442080bf',
        email: user.email,
        prepared: false,
        attempts: 1,
        createdAt: now,
        availableAt: now,
    };
    const storedReset = { userId: user.id, expiresAt, user: { passwordHash: user.passwordHash } };
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
        createForJob: vi.fn<PasswordResetTokenService['createForJob']>(),
        hash: vi.fn<PasswordResetTokenService['hash']>(),
    };
    const repository = {
        reserveRequest: vi.fn<PasswordResetRepository['reserveRequest']>(),
        findByTokenHash: vi.fn<PasswordResetRepository['findByTokenHash']>(),
        consume: vi.fn<PasswordResetRepository['consume']>(),
    };
    const jobs = {
        enqueue: vi.fn<PasswordRecoveryJobRepository['enqueue']>(),
        markPrepared: vi.fn<PasswordRecoveryJobRepository['markPrepared']>(),
    };
    const mailService = { send: vi.fn<MailService['send']>() };
    const passwordService = { hash: vi.fn<PasswordService['hash']>() };

    const notifications = { enqueuePasswordChanged: vi.fn<PasswordNotificationService['enqueuePasswordChanged']>() };

    function createDeferredCompletion() {
        let resolve!: () => void;
        const promise = new Promise<void>((complete) => { resolve = complete; });
        return { promise, resolve };
    }

    beforeEach(async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(now);
        events = [];
        prisma.$transaction.mockClear();
        for (const dependency of [usersService, tokenService, repository, jobs, mailService, passwordService, notifications]) {
            for (const method of Object.values(dependency)) method.mockReset();
        }

        usersService.findByEmail.mockResolvedValue(user);
        usersService.updatePassword.mockResolvedValue({ id: user.id, email: user.email });
        tokenService.createForJob.mockReturnValue({ token, tokenHash });
        jobs.enqueue.mockResolvedValue(undefined);
        jobs.markPrepared.mockResolvedValue(true);
        tokenService.hash.mockReturnValue(tokenHash);
        repository.reserveRequest.mockResolvedValue(true);
        repository.findByTokenHash.mockResolvedValue(storedReset);
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
                { provide: PasswordRecoveryJobRepository, useValue: jobs },
                { provide: PasswordNotificationService, useValue: notifications },
                PasswordRecoveryService,
            ],
        }).compile();
        service = module.get(PasswordRecoveryService);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('request', () => {
        it('waits for the durable enqueue without looking up the account or sending mail', async () => {
            const stored = createDeferredCompletion();
            jobs.enqueue.mockReturnValue(stored.promise);
            const complete = vi.fn();
            const requested = service.request(user.email).then(complete);

            try {
                await settleBackgroundTasks();
                expect(jobs.enqueue).toHaveBeenCalledExactlyOnceWith(user.email);
                expect(complete).not.toHaveBeenCalled();
                expect(usersService.findByEmail).not.toHaveBeenCalled();
                expect(mailService.send).not.toHaveBeenCalled();
            } finally {
                stored.resolve();
                await requested;
            }
            expect(complete).toHaveBeenCalledOnce();
        });

        it('propagates an enqueue failure instead of acknowledging the request', async () => {
            const error = new Error('Database unavailable');
            jobs.enqueue.mockRejectedValue(error);

            await expect(service.request(user.email)).rejects.toBe(error);
        });
    });

    describe('processRequest', () => {
        it('should ignore unknown accounts without creating a request or sending mail', async () => {
            usersService.findByEmail.mockResolvedValue(null);

            await service.processRequest(job);

            expect(tokenService.createForJob).not.toHaveBeenCalled();
            expect(prisma.$transaction).not.toHaveBeenCalled();
            expect(repository.reserveRequest).not.toHaveBeenCalled();
            expect(mailService.send).not.toHaveBeenCalled();
        });

        it.each([
            { passwordHash: user.passwordHash, mode: PASSWORD_FORM_MODE.reset, subject: 'Reset your Ludora password' },
            { passwordHash: null, mode: PASSWORD_FORM_MODE.create, subject: 'Create your Ludora password' },
        ])('should reserve the token before sending an English $mode link', async ({ passwordHash, mode, subject }) => {
            usersService.findByEmail.mockResolvedValue({ ...user, passwordHash });
            await service.processRequest(job);

            expect(tokenService.createForJob).toHaveBeenCalledExactlyOnceWith(job.id);
            expect(jobs.markPrepared).toHaveBeenCalledExactlyOnceWith(job, transaction);
            expect(jobs.markPrepared).toHaveBeenCalledBefore(repository.reserveRequest);
            expect(repository.reserveRequest).toHaveBeenCalledExactlyOnceWith({
                userId: user.id,
                tokenHash,
                expiresAt,
                lastSentAt: now,
                requestBefore: new Date(now.getTime() - PASSWORD_RESET_CONFIG.requestCooldownSeconds * MILLISECONDS_PER_SECOND),
            }, transaction);
            expect(events).toEqual(['transaction:start', 'transaction:resolved', 'mail:send']);
            expect(mailService.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ to: user.email }), { idempotencyKey: job.id });
            const [mail] = mailService.send.mock.calls[0];
            expect(mail.to).toBe(user.email);
            expect(mail.subject).toBe(subject);
            const link = new URL(mail.text.split('\n').find((line) => line.startsWith(resetUrl))!);
            expect(link.origin + link.pathname).toBe(resetUrl);
            expect(link.searchParams.get('token')).toBe(token);
            expect(link.searchParams.get('mode')).toBe(mode);
            expect(mail.text).not.toContain(tokenHash);
            expect(mail.text).not.toContain(user.passwordHash);
        });

        it('should preserve the account cooldown without sending another link', async () => {
            repository.reserveRequest.mockResolvedValue(false);

            await service.processRequest(job);

            expect(repository.reserveRequest).toHaveBeenCalledOnce();
            expect(mailService.send).not.toHaveBeenCalled();
            expect(events).toEqual(['transaction:start', 'transaction:resolved']);
        });

        it('propagates a reservation failure to the worker and skips delivery', async () => {
            const error = new Error('Database failure');
            repository.reserveRequest.mockRejectedValue(error);

            await expect(service.processRequest(job)).rejects.toBe(error);

            expect(mailService.send).not.toHaveBeenCalled();
        });

        it('reuses a prepared reservation without reserving the token again', async () => {
            await service.processRequest({ ...job, prepared: true, attempts: 2 });

            expect(tokenService.createForJob).toHaveBeenCalledExactlyOnceWith(job.id);
            expect(repository.findByTokenHash).toHaveBeenCalledExactlyOnceWith(tokenHash);
            expect(jobs.markPrepared).not.toHaveBeenCalled();
            expect(repository.reserveRequest).not.toHaveBeenCalled();
            expect(mailService.send).toHaveBeenCalledOnce();
        });

        it('does not recreate a consumed or replaced token while retrying delivery', async () => {
            repository.findByTokenHash.mockResolvedValue(null);

            await service.processRequest({ ...job, prepared: true, attempts: 2 });

            expect(repository.reserveRequest).not.toHaveBeenCalled();
            expect(mailService.send).not.toHaveBeenCalled();
        });
    });

    describe('reset', () => {
        it.each([
            ['missing', null],
            ['expired', { ...storedReset, expiresAt: new Date(now.getTime() - MILLISECONDS_PER_SECOND) }],
            ['at the expiration deadline', { ...storedReset, expiresAt: now }],
        ] as const)('should reject a %s link before hashing the password', async (_label, reset) => {
            repository.findByTokenHash.mockResolvedValue(reset);

            await expect(service.reset(token, newPassword)).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
                response: AUTH_ERRORS.passwordResetInvalid,
            });

            expect(tokenService.hash).toHaveBeenCalledExactlyOnceWith(token);
            expect(passwordService.hash).not.toHaveBeenCalled();
            expect(prisma.$transaction).not.toHaveBeenCalled();
            expect(notifications.enqueuePasswordChanged).not.toHaveBeenCalled();
        });

        it.each([
            { passwordHash: user.passwordHash, firstPassword: false },
            { passwordHash: null, firstPassword: true },
        ])('queues the password notice atomically with firstPassword=$firstPassword', async ({ passwordHash, firstPassword }) => {
            repository.findByTokenHash.mockResolvedValue({ ...storedReset, user: { passwordHash } });
            await expect(service.reset(token, newPassword)).resolves.toBeUndefined();

            expect(passwordService.hash).toHaveBeenCalledExactlyOnceWith(newPassword);
            expect(repository.consume).toHaveBeenCalledExactlyOnceWith({ tokenHash, now }, transaction);
            expect(usersService.updatePassword).toHaveBeenCalledExactlyOnceWith(user.id, newPasswordHash, transaction);
            expect(repository.consume).toHaveBeenCalledBefore(usersService.updatePassword);
            expect(events).toEqual(['password:hash', 'transaction:start', 'transaction:resolved']);
            expect(mailService.send).not.toHaveBeenCalled();
            expect(notifications.enqueuePasswordChanged).toHaveBeenCalledExactlyOnceWith(user.id, firstPassword, transaction);
            expect(usersService.updatePassword).toHaveBeenCalledBefore(notifications.enqueuePasswordChanged);
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
            expect(notifications.enqueuePasswordChanged).not.toHaveBeenCalled();
        });

        it('should reject a token already consumed or renewed by a concurrent operation', async () => {
            repository.consume.mockResolvedValue(false);

            await expect(service.reset(token, newPassword)).rejects.toMatchObject({
                status: HttpStatus.BAD_REQUEST,
                response: AUTH_ERRORS.passwordResetInvalid,
            });

            expect(usersService.updatePassword).not.toHaveBeenCalled();
            expect(notifications.enqueuePasswordChanged).not.toHaveBeenCalled();
            expect(mailService.send).not.toHaveBeenCalled();
            expect(events).toEqual(['password:hash', 'transaction:start', 'transaction:rejected']);
        });

        it('should propagate a hashing failure without consuming the token', async () => {
            const error = new Error('Password hashing failed');
            passwordService.hash.mockRejectedValue(error);

            await expect(service.reset(token, newPassword)).rejects.toBe(error);

            expect(prisma.$transaction).not.toHaveBeenCalled();
            expect(repository.consume).not.toHaveBeenCalled();
            expect(notifications.enqueuePasswordChanged).not.toHaveBeenCalled();
        });

        it('should propagate an update failure without scheduling a false success notice', async () => {
            const error = new Error('Password update failed');
            usersService.updatePassword.mockRejectedValue(error);

            await expect(service.reset(token, newPassword)).rejects.toBe(error);

            expect(repository.consume).toHaveBeenCalledWith({ tokenHash, now }, transaction);
            expect(events).toEqual(['password:hash', 'transaction:start', 'transaction:rejected']);
            expect(notifications.enqueuePasswordChanged).not.toHaveBeenCalled();
            expect(mailService.send).not.toHaveBeenCalled();
        });

        it('waits for the password and notice transaction to commit before completing the reset', async () => {
            const commit = createDeferredCompletion();
            prisma.$transaction.mockImplementationOnce(async (operation) => {
                const result = await operation(transaction);
                await commit.promise;
                return result;
            });

            const completed = vi.fn();
            const reset = service.reset(token, newPassword).then(completed);
            try {
                await settleBackgroundTasks();
                expect(notifications.enqueuePasswordChanged).toHaveBeenCalledExactlyOnceWith(user.id, false, transaction);
                expect(completed).not.toHaveBeenCalled();
            } finally {
                commit.resolve();
                await reset;
            }
            expect(completed).toHaveBeenCalledOnce();
        });

        it('propagates a notice enqueue failure so the password update rolls back', async () => {
            const error = new Error('Notice enqueue failed');
            notifications.enqueuePasswordChanged.mockRejectedValue(error);

            await expect(service.reset(token, newPassword)).rejects.toBe(error);
            expect(events).toEqual(['password:hash', 'transaction:start', 'transaction:rejected']);
            expect(mailService.send).not.toHaveBeenCalled();
        });
    });
});
