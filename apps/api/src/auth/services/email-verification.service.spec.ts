import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import type { EmailVerification, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import { AUTH_ERRORS } from '../constants/auth-errors.js';
import { EMAIL_VERIFICATION_CONFIG } from '../constants/email-verification.js';
import { EmailVerificationRepository } from '../repositories/index.js';
import { EmailVerificationService } from './email-verification.service.js';
import { EmailVerificationCodeService } from './email-verification-code.service.js';

describe('EmailVerificationService', () => {
    let service: EmailVerificationService;
    let events: string[];

    const now = new Date('2026-10-29T12:00:00.000Z');
    const verificationId = '25f2ce15-8c54-46b2-96f8-cdd77889ac6f';
    const userId = 'a0db3414-7659-46ee-8435-1a32f52b1f26';
    const code = '123456';
    const { expiresInSeconds, maxFailedAttempts, resendCooldownSeconds } = EMAIL_VERIFICATION_CONFIG;
    const futureExpiry = new Date(now.getTime() + expiresInSeconds * 1_000);
    const futureResend = new Date(now.getTime() + resendCooldownSeconds * 1_000);
    const verification: EmailVerification = {
        id: verificationId,
        userId,
        codeHash: 'stored-code-hash',
        expiresAt: futureExpiry,
        failedAttempts: 1,
        deliveryId: null,
        deliveryAvailableAt: null,
        deliveryAttempts: 0,
        lastSentAt: now,
        createdAt: new Date('2026-10-29T11:50:00.000Z'),
    };
    // Repositories receive this opaque token; no Prisma client is constructed.
    const transaction = {} as Prisma.TransactionClient;
    const prisma = {
        $transaction: vi.fn(async <T>(operation: (client: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
            events.push('transaction:start');

            try {
                const result = await operation(transaction);
                events.push('transaction:commit');
                return result;
            } catch (error) {
                events.push('transaction:rollback');
                throw error;
            }
        }),
    };
    const repository = {
        findPendingByUserId: vi.fn<EmailVerificationRepository['findPendingByUserId']>(),
        findPendingById: vi.fn<EmailVerificationRepository['findPendingById']>(),
        findById: vi.fn<EmailVerificationRepository['findById']>(),
        reserveResend: vi.fn<EmailVerificationRepository['reserveResend']>(),
        renewCode: vi.fn<EmailVerificationRepository['renewCode']>(),
        reserveAttempt: vi.fn<EmailVerificationRepository['reserveAttempt']>(),
        delete: vi.fn<EmailVerificationRepository['delete']>(),
    };
    const codeService = {
        generateForDelivery: vi.fn<EmailVerificationCodeService['generateForDelivery']>(),
        hash: vi.fn<EmailVerificationCodeService['hash']>(),
        verify: vi.fn<EmailVerificationCodeService['verify']>(),
    };
    const usersService = {
        markEmailVerifiedIfPending: vi.fn<UsersService['markEmailVerifiedIfPending']>(),
    };

    beforeEach(async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(now);
        // Preserve the transaction runner implementation, while resetting each dependency.
        prisma.$transaction.mockClear();
        events = [];
        for (const dependency of [repository, codeService, usersService]) {
            for (const method of Object.values(dependency)) method.mockReset();
        }

        repository.findPendingByUserId.mockResolvedValue({
            id: verificationId,
            expiresAt: futureExpiry,
            lastSentAt: now,
        });
        repository.findPendingById.mockResolvedValue(verification);
        repository.findById.mockResolvedValue(verification);
        repository.reserveResend.mockResolvedValue(true);
        repository.reserveAttempt.mockResolvedValue(true);
        repository.renewCode.mockResolvedValue({ id: verificationId });
        repository.delete.mockResolvedValue(verification);
        codeService.generateForDelivery.mockReturnValue(code);
        codeService.hash.mockReturnValue('renewed-code-hash');
        codeService.verify.mockReturnValue(true);
        usersService.markEmailVerifiedIfPending.mockResolvedValue(true);

        const module = await Test.createTestingModule({
            providers: [
                { provide: PrismaService, useValue: prisma },
                { provide: EmailVerificationCodeService, useValue: codeService },
                { provide: EmailVerificationRepository, useValue: repository },
                { provide: UsersService, useValue: usersService },
                {
                    provide: EmailVerificationService,
                    inject: [PrismaService, EmailVerificationCodeService, EmailVerificationRepository, UsersService],
                    useFactory: (
                        database: PrismaService,
                        codes: EmailVerificationCodeService,
                        verifications: EmailVerificationRepository,
                        users: UsersService,
                    ) => new EmailVerificationService(database, codes, verifications, users),
                },
            ],
        }).compile();

        service = module.get(EmailVerificationService);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('getPending', () => {
        it('should return only the pending identifier and dates without resetting the verification', async () => {
            await expect(service.getPending(userId)).resolves.toEqual({
                id: verificationId,
                expiresAt: futureExpiry,
                resendAvailableAt: futureResend,
            });

            expect(repository.findPendingByUserId).toHaveBeenCalledExactlyOnceWith(userId);
            expect(prisma.$transaction).not.toHaveBeenCalled();
            expect(repository.reserveResend).not.toHaveBeenCalled();
            expect(repository.renewCode).not.toHaveBeenCalled();
            expect(codeService.generateForDelivery).not.toHaveBeenCalled();
        });

        it('should keep expired verification context available so the user can request a new code', async () => {
            const expiresAt = new Date(now.getTime() - 1_000);
            repository.findPendingByUserId.mockResolvedValue({
                id: verificationId,
                expiresAt,
                lastSentAt: verification.createdAt,
            });

            await expect(service.getPending(userId)).resolves.toEqual({
                id: verificationId,
                expiresAt,
                resendAvailableAt: new Date(verification.createdAt.getTime() + resendCooldownSeconds * 1_000),
            });

            expect(repository.renewCode).not.toHaveBeenCalled();
        });

        it('should return null when there is no pending verification', async () => {
            repository.findPendingByUserId.mockResolvedValue(null);

            await expect(service.getPending(userId)).resolves.toBeNull();

            expect(prisma.$transaction).not.toHaveBeenCalled();
            expect(codeService.generateForDelivery).not.toHaveBeenCalled();
        });
    });

    describe('resend', () => {
        it('queues the renewed verification code in the same transaction as the resend reservation', async () => {
            await expect(service.resend(verificationId)).resolves.toEqual({
                verification: {
                    id: verificationId,
                    expiresAt: futureExpiry,
                    resendAvailableAt: futureResend,
                    emailSent: false,
                    emailQueued: true,
                },
            });

            expect(repository.reserveResend).toHaveBeenCalledExactlyOnceWith({
                verificationId,
                now,
                resendBefore: new Date(now.getTime() - resendCooldownSeconds * 1_000),
            }, transaction);
            expect(repository.findPendingById).toHaveBeenCalledWith(verificationId, transaction);
            expect(repository.renewCode).toHaveBeenCalledExactlyOnceWith({
                id: verificationId,
                codeHash: 'renewed-code-hash',
                expiresAt: futureExpiry,
                deliveryId: expect.any(String),
                deliveryAvailableAt: now,
                deliveryAttempts: 0,
            }, transaction);
            const [[{ deliveryId }]] = repository.renewCode.mock.calls;
            expect(codeService.generateForDelivery).toHaveBeenCalledExactlyOnceWith(verificationId, deliveryId);
            expect(repository.reserveResend).toHaveBeenCalledBefore(repository.findPendingById);
            expect(repository.findPendingById).toHaveBeenCalledBefore(repository.renewCode);
            expect(codeService.hash).toHaveBeenCalledWith(verificationId, code);
            expect(events).toEqual(['transaction:start', 'transaction:commit']);
        });

        it('should return the remaining cooldown in seconds without queuing a delivery', async () => {
            repository.reserveResend.mockResolvedValue(false);
            repository.findPendingById.mockResolvedValue({
                ...verification,
                lastSentAt: new Date(now.getTime() - 15_500),
            });

            await expect(service.resend(verificationId)).rejects.toMatchObject({
                status: 429,
                response: {
                    ...AUTH_ERRORS.emailVerificationResendTooSoon,
                    retryAfterSeconds: 45,
                },
            });

            expect(repository.renewCode).not.toHaveBeenCalled();
            expect(codeService.generateForDelivery).not.toHaveBeenCalled();
            expect(events).toEqual(['transaction:start', 'transaction:rollback']);
        });

        it('should reject a missing or already consumed verification instead of reporting cooldown', async () => {
            repository.reserveResend.mockResolvedValue(false);
            repository.findPendingById.mockResolvedValue(null);

            await expect(service.resend(verificationId)).rejects.toMatchObject({
                status: 400,
                response: AUTH_ERRORS.emailVerificationInvalid,
            });

            expect(repository.renewCode).not.toHaveBeenCalled();
        });

        it('should generate only once even if the new code has the same hash as before', async () => {
            codeService.hash.mockReturnValue(verification.codeHash);

            await service.resend(verificationId);

            expect(codeService.generateForDelivery).toHaveBeenCalledTimes(1);
            expect(repository.renewCode).toHaveBeenCalledWith(expect.objectContaining({
                codeHash: verification.codeHash,
            }), transaction);
        });

        it('rolls back the reservation when queuing the renewed code fails', async () => {
            const error = new Error('Database update failed');
            repository.renewCode.mockRejectedValue(error);

            await expect(service.resend(verificationId)).rejects.toBe(error);

            expect(events).toEqual(['transaction:start', 'transaction:rollback']);
        });

    });

    describe('confirm', () => {
        it('should reserve an attempt, verify the code and mark the user in the same transaction', async () => {
            await expect(service.confirm(verificationId, code)).resolves.toBe(userId);

            expect(repository.reserveAttempt).toHaveBeenCalledExactlyOnceWith({
                verificationId,
                now,
                maxFailedAttempts,
            }, transaction);
            expect(repository.findById).toHaveBeenCalledWith(verificationId, transaction);
            expect(repository.reserveAttempt).toHaveBeenCalledBefore(repository.findById);
            expect(codeService.verify).toHaveBeenCalledWith(verificationId, code, verification.codeHash);
            expect(usersService.markEmailVerifiedIfPending).toHaveBeenCalledExactlyOnceWith(userId, transaction);
            expect(repository.delete).toHaveBeenCalledExactlyOnceWith(verificationId, transaction);
            expect(usersService.markEmailVerifiedIfPending).toHaveBeenCalledBefore(repository.delete);
            expect(events).toEqual(['transaction:start', 'transaction:commit']);
        });

        it('should allow a correct code on the last permitted attempt', async () => {
            repository.findById.mockResolvedValue({ ...verification, failedAttempts: maxFailedAttempts });

            await expect(service.confirm(verificationId, code)).resolves.toBe(userId);

            expect(repository.delete).toHaveBeenCalledWith(verificationId, transaction);
        });

        it('should finish the transaction for a wrong code before returning the error', async () => {
            codeService.verify.mockReturnValue(false);

            await expect(service.confirm(verificationId, '999999')).rejects.toMatchObject({
                status: 400,
                response: AUTH_ERRORS.emailVerificationCodeInvalid,
            });

            expect(codeService.verify).toHaveBeenCalledWith(verificationId, '999999', verification.codeHash);
            expect(repository.reserveAttempt).toHaveBeenCalledTimes(1);
            expect(usersService.markEmailVerifiedIfPending).not.toHaveBeenCalled();
            expect(repository.delete).not.toHaveBeenCalled();
            expect(events).toEqual(['transaction:start', 'transaction:commit']);
        });

        it('should report exhausted attempts after a wrong code uses the last allowed attempt', async () => {
            repository.findById.mockResolvedValue({ ...verification, failedAttempts: maxFailedAttempts });
            codeService.verify.mockReturnValue(false);

            await expect(service.confirm(verificationId, '999999')).rejects.toMatchObject({
                status: 400,
                response: AUTH_ERRORS.emailVerificationAttemptsExceeded,
            });

            expect(usersService.markEmailVerifiedIfPending).not.toHaveBeenCalled();
            expect(repository.delete).not.toHaveBeenCalled();
            expect(events).toEqual(['transaction:start', 'transaction:commit']);
        });

        it('should reject an expired code without comparing it or activating the user', async () => {
            repository.reserveAttempt.mockResolvedValue(false);
            repository.findById.mockResolvedValue({ ...verification, expiresAt: now });

            await expect(service.confirm(verificationId, code)).rejects.toMatchObject({
                status: 400,
                response: AUTH_ERRORS.emailVerificationExpired,
            });

            expect(codeService.verify).not.toHaveBeenCalled();
            expect(usersService.markEmailVerifiedIfPending).not.toHaveBeenCalled();
            expect(repository.delete).not.toHaveBeenCalled();
        });

        it('should reject a verification with no attempts left before comparing the code', async () => {
            repository.reserveAttempt.mockResolvedValue(false);
            repository.findById.mockResolvedValue({ ...verification, failedAttempts: maxFailedAttempts });

            await expect(service.confirm(verificationId, code)).rejects.toMatchObject({
                status: 400,
                response: AUTH_ERRORS.emailVerificationAttemptsExceeded,
            });

            expect(codeService.verify).not.toHaveBeenCalled();
            expect(usersService.markEmailVerifiedIfPending).not.toHaveBeenCalled();
            expect(repository.delete).not.toHaveBeenCalled();
        });

        it('should reject a missing or consumed verification', async () => {
            repository.reserveAttempt.mockResolvedValue(false);
            repository.findById.mockResolvedValue(null);

            await expect(service.confirm(verificationId, code)).rejects.toMatchObject({
                status: 400,
                response: AUTH_ERRORS.emailVerificationInvalid,
            });

            expect(codeService.verify).not.toHaveBeenCalled();
            expect(usersService.markEmailVerifiedIfPending).not.toHaveBeenCalled();
            expect(repository.delete).not.toHaveBeenCalled();
        });

        it('should not consume the verification when the user could not be marked as verified', async () => {
            usersService.markEmailVerifiedIfPending.mockResolvedValue(false);

            await expect(service.confirm(verificationId, code)).rejects.toMatchObject({
                status: 400,
                response: AUTH_ERRORS.emailVerificationInvalid,
            });

            expect(repository.delete).not.toHaveBeenCalled();
        });

        it('should propagate a persistence failure so the transaction can roll back', async () => {
            const error = new Error('Could not consume verification');
            repository.delete.mockRejectedValue(error);

            await expect(service.confirm(verificationId, code)).rejects.toBe(error);

            expect(events).toEqual(['transaction:start', 'transaction:rollback']);
        });
    });
});
