import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { SINGLE_RECORD_COUNT } from '../../common/constants/database.js';
import { MILLISECONDS_PER_SECOND } from '../../common/constants/time.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PASSWORD_RESET_CONFIG } from '../constants/password-reset.js';
import { PasswordResetRepository } from './password-reset.repository.js';

describe('PasswordResetRepository', () => {
    let repository: PasswordResetRepository;

    const now = new Date('2026-11-04T12:00:00.000Z');
    const userId = 'a0db3414-7659-46ee-8435-1a32f52b1f26';
    const tokenHash = 'stored-token-hash';
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_CONFIG.expiresInSeconds * MILLISECONDS_PER_SECOND);
    const requestBefore = new Date(now.getTime() - PASSWORD_RESET_CONFIG.requestCooldownSeconds * MILLISECONDS_PER_SECOND);
    const data = { userId, tokenHash, expiresAt, lastSentAt: now, requestBefore };
    const databaseQueries = { findUnique: vi.fn() };
    const transactionQueries = {
        createMany: vi.fn(),
        updateMany: vi.fn(),
        findUnique: vi.fn(),
        deleteMany: vi.fn(),
    };
    const transaction = { passwordReset: transactionQueries } as unknown as Prisma.TransactionClient;

    beforeEach(async () => {
        vi.resetAllMocks();
        transactionQueries.createMany.mockResolvedValue({ count: SINGLE_RECORD_COUNT });
        transactionQueries.updateMany.mockResolvedValue({ count: SINGLE_RECORD_COUNT });
        transactionQueries.deleteMany.mockResolvedValue({ count: SINGLE_RECORD_COUNT });

        const module = await Test.createTestingModule({
            providers: [
                { provide: PrismaService, useValue: { passwordReset: databaseQueries } },
                {
                    provide: PasswordResetRepository,
                    inject: [PrismaService],
                    useFactory: (prisma: PrismaService) => new PasswordResetRepository(prisma),
                },
            ],
        }).compile();
        repository = module.get(PasswordResetRepository);
    });

    describe('reserveRequest', () => {
        it('should insert the hash and timestamps while skipping duplicate users', async () => {
            await expect(repository.reserveRequest(data, transaction)).resolves.toBe(true);

            expect(transactionQueries.createMany).toHaveBeenCalledExactlyOnceWith({
                data: { userId, tokenHash, expiresAt, lastSentAt: now },
                skipDuplicates: true,
            });
            expect(transactionQueries.updateMany).not.toHaveBeenCalled();
        });

        it('should renew an existing request only with the cooldown condition inside the update', async () => {
            transactionQueries.createMany.mockResolvedValue({ count: 0 });

            await expect(repository.reserveRequest(data, transaction)).resolves.toBe(true);

            expect(transactionQueries.updateMany).toHaveBeenCalledExactlyOnceWith({
                where: { userId, lastSentAt: { lte: requestBefore } },
                data: { tokenHash, expiresAt, lastSentAt: now },
            });
            expect(transactionQueries.createMany).toHaveBeenCalledBefore(transactionQueries.updateMany);
        });

        it('should return false when neither insertion nor conditional renewal changes a record', async () => {
            transactionQueries.createMany.mockResolvedValue({ count: 0 });
            transactionQueries.updateMany.mockResolvedValue({ count: 0 });

            await expect(repository.reserveRequest(data, transaction)).resolves.toBe(false);
        });

        it('should propagate insertion failures instead of trying a renewal', async () => {
            const error = new Error('Database unavailable');
            transactionQueries.createMany.mockRejectedValue(error);

            await expect(repository.reserveRequest(data, transaction)).rejects.toBe(error);

            expect(transactionQueries.updateMany).not.toHaveBeenCalled();
        });
    });

    describe('findByTokenHash', () => {
        it('should read the owner, expiration and prior credential state using the default client', async () => {
            const reset = { userId, expiresAt, user: { passwordHash: null } };
            databaseQueries.findUnique.mockResolvedValue(reset);

            await expect(repository.findByTokenHash(tokenHash)).resolves.toEqual(reset);

            expect(databaseQueries.findUnique).toHaveBeenCalledExactlyOnceWith({
                where: { tokenHash },
                select: { userId: true, expiresAt: true, user: { select: { passwordHash: true } } },
            });
            expect(transactionQueries.findUnique).not.toHaveBeenCalled();
        });

        it('should use the supplied transaction for lookup when present', async () => {
            transactionQueries.findUnique.mockResolvedValue(null);

            await expect(repository.findByTokenHash(tokenHash, transaction)).resolves.toBeNull();

            expect(transactionQueries.findUnique).toHaveBeenCalledOnce();
            expect(databaseQueries.findUnique).not.toHaveBeenCalled();
        });
    });

    describe('consume', () => {
        it('should conditionally delete by token hash and a strict expiration bound', async () => {
            await expect(repository.consume({ tokenHash, now }, transaction)).resolves.toBe(true);

            expect(transactionQueries.deleteMany).toHaveBeenCalledExactlyOnceWith({
                where: { tokenHash, expiresAt: { gt: now } },
            });
        });

        it('should return false when no live token was deleted', async () => {
            transactionQueries.deleteMany.mockResolvedValue({ count: 0 });

            await expect(repository.consume({ tokenHash, now }, transaction)).resolves.toBe(false);
        });

        it('should propagate a deletion failure to the transaction owner', async () => {
            const error = new Error('Delete failed');
            transactionQueries.deleteMany.mockRejectedValue(error);

            await expect(repository.consume({ tokenHash, now }, transaction)).rejects.toBe(error);
        });
    });

    describe('deleteForUser', () => {
        it('should remove pending recovery tokens for only the authenticated user in the supplied transaction', async () => {
            await repository.deleteForUser(userId, transaction);

            expect(transactionQueries.deleteMany).toHaveBeenCalledExactlyOnceWith({ where: { userId } });
        });
    });
});
