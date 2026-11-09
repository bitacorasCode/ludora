import { Injectable } from '@nestjs/common';

import { SINGLE_RECORD_COUNT } from '../../common/constants/database.js';
import type { PasswordReset, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type ReservePasswordResetData = Pick<
    PasswordReset,
    'userId' | 'tokenHash' | 'expiresAt' | 'lastSentAt'
> & {
    requestBefore: Date;
};

type ConsumePasswordResetData = Pick<PasswordReset, 'tokenHash'> & {
    now: Date;
};

@Injectable()
export class PasswordResetRepository {
    constructor(private readonly prisma: PrismaService) {}

    async reserveRequest(
        {
            userId,
            tokenHash,
            expiresAt,
            lastSentAt,
            requestBefore,
        }: ReservePasswordResetData,
        transaction: Prisma.TransactionClient,
    ): Promise<boolean> {
        const data = { tokenHash, expiresAt, lastSentAt };

        // A concurrent request may have already created this user's row.
        const { count: createdCount } = await transaction.passwordReset.createMany({
            data: { userId, ...data },
            skipDuplicates: true,
        });

        if (createdCount === SINGLE_RECORD_COUNT) {
            return true;
        }

        // Check the waiting period in the update itself, under the row lock.
        const { count: renewedCount } = await transaction.passwordReset.updateMany({
            where: {
                userId,
                lastSentAt: { lte: requestBefore },
            },
            data,
        });

        return renewedCount === SINGLE_RECORD_COUNT;
    }

    findByTokenHash(
        tokenHash: string,
        transaction: Prisma.TransactionClient = this.prisma,
    ) {
        return transaction.passwordReset.findUnique({
            where: { tokenHash },
            select: {
                userId: true,
                expiresAt: true,
            },
        });
    }

    deleteForUser(userId: string, transaction: Prisma.TransactionClient) {
        return transaction.passwordReset.deleteMany({ where: { userId } });
    }

    // Consume the token in the same transaction that changes the password.
    async consume(
        { tokenHash, now }: ConsumePasswordResetData,
        transaction: Prisma.TransactionClient,
    ): Promise<boolean> {
        const { count } = await transaction.passwordReset.deleteMany({
            where: {
                tokenHash,
                expiresAt: { gt: now },
            },
        });

        return count === SINGLE_RECORD_COUNT;
    }
}
