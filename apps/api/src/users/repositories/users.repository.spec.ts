import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { SINGLE_RECORD_COUNT } from '../../common/constants/database.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersRepository } from './users.repository.js';

describe('UsersRepository authentication queries', () => {
    let repository: UsersRepository;

    const userId = 'a0db3414-7659-46ee-8435-1a32f52b1f26';
    const passwordHash = 'new-password-hash';
    const publicSelection = { id: true, nickname: true, email: true, createdAt: true };
    const databaseQueries = { findUnique: vi.fn(), update: vi.fn() };
    const transactionQueries = { update: vi.fn(), updateMany: vi.fn() };
    const transaction = { user: transactionQueries } as unknown as Prisma.TransactionClient;

    beforeEach(async () => {
        vi.resetAllMocks();
        transactionQueries.update.mockResolvedValue({ id: userId, email: 'player@example.com' });
        const module = await Test.createTestingModule({
            providers: [
                { provide: PrismaService, useValue: { user: databaseQueries } },
                {
                    provide: UsersRepository,
                    inject: [PrismaService],
                    useFactory: (prisma: PrismaService) => new UsersRepository(prisma),
                },
            ],
        }).compile();
        repository = module.get(UsersRepository);
    });

    describe('updatePassword', () => {
        it('should update the hash and increment authentication version in one transaction query', async () => {
            await expect(repository.updatePassword(userId, passwordHash, transaction)).resolves.toEqual({
                id: userId,
                email: 'player@example.com',
            });

            expect(transactionQueries.update).toHaveBeenCalledExactlyOnceWith({
                where: { id: userId },
                data: { passwordHash, authVersion: { increment: 1 } },
                select: { id: true, email: true },
            });
            expect(databaseQueries.update).not.toHaveBeenCalled();
        });

        it('should propagate an update failure to the transaction owner', async () => {
            const error = new Error('User update failed');
            transactionQueries.update.mockRejectedValue(error);

            await expect(repository.updatePassword(userId, passwordHash, transaction)).rejects.toBe(error);
        });
    });

    describe('user selection', () => {
        it('should include only the avatar relation for a current-user response', async () => {
            databaseQueries.findUnique.mockResolvedValue(null);

            await expect(repository.findCurrentById(userId)).resolves.toBeNull();

            expect(databaseQueries.findUnique).toHaveBeenCalledExactlyOnceWith({
                where: { id: userId },
                select: { ...publicSelection, profile: { select: { avatarPresetId: true } } },
            });
        });

        it('should read the private hash only for password-change verification', async () => {
            databaseQueries.findUnique.mockResolvedValue(null);

            await expect(repository.findPasswordById(userId)).resolves.toBeNull();

            expect(databaseQueries.findUnique).toHaveBeenCalledExactlyOnceWith({
                where: { id: userId },
                select: { ...publicSelection, passwordHash: true, authVersion: true, emailVerifiedAt: true },
            });
        });
        it('should keep authentication version and password hash out of public user reads', async () => {
            databaseQueries.findUnique.mockResolvedValue(null);

            await expect(repository.findById(userId)).resolves.toBeNull();

            expect(databaseQueries.findUnique).toHaveBeenCalledExactlyOnceWith({
                where: { id: userId },
                select: publicSelection,
            });
        });

        it('should include verification and version fields only for internal authentication reads', async () => {
            databaseQueries.findUnique.mockResolvedValue(null);

            await expect(repository.findAuthenticationById(userId)).resolves.toBeNull();

            expect(databaseQueries.findUnique).toHaveBeenCalledExactlyOnceWith({
                where: { id: userId },
                select: { ...publicSelection, authVersion: true, emailVerifiedAt: true },
            });
        });
    });

    describe('changePasswordIfCurrent', () => {
        const change = {
            userId,
            passwordHash,
            expectedPasswordHash: 'current-password-hash',
            expectedAuthVersion: 0,
        };

        it('should compare the verified hash and auth version in the update that changes both values', async () => {
            transactionQueries.updateMany.mockResolvedValue({ count: SINGLE_RECORD_COUNT });

            await expect(repository.changePasswordIfCurrent(change, transaction)).resolves.toBe(true);

            expect(transactionQueries.updateMany).toHaveBeenCalledExactlyOnceWith({
                where: {
                    id: userId,
                    passwordHash: change.expectedPasswordHash,
                    authVersion: change.expectedAuthVersion,
                },
                data: { passwordHash, authVersion: { increment: 1 } },
            });
            expect(transactionQueries.update).not.toHaveBeenCalled();
        });

        it('should report a stale comparison without treating it as a successful change', async () => {
            transactionQueries.updateMany.mockResolvedValue({ count: 0 });

            await expect(repository.changePasswordIfCurrent(change, transaction)).resolves.toBe(false);
        });
    });
});
