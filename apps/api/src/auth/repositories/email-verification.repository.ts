import { Injectable } from '@nestjs/common';

import type { EmailVerification, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type CreateEmailVerificationData = Pick<
    EmailVerification,
    'id' | 'userId' | 'codeHash' | 'expiresAt'
>;

type ReserveAttemptData = {
    verificationId: string;
    now: Date;
    maxFailedAttempts: number;
};

@Injectable()
export class EmailVerificationRepository {
    constructor(private readonly prisma: PrismaService) {}

    create(
        data: CreateEmailVerificationData,
        transaction: Prisma.TransactionClient = this.prisma,
    ) {
        return transaction.emailVerification.create({
            data,
            select: { id: true },
        });
    }

    findById(
        id: string,
        transaction: Prisma.TransactionClient = this.prisma,
    ) {
        return transaction.emailVerification.findUnique({
            where: { id },
        });
    }

    // The confirmation transaction must keep the row lock until it completes.
    async reserveAttempt(
        { verificationId, now, maxFailedAttempts }: ReserveAttemptData,
        transaction: Prisma.TransactionClient,
    ): Promise<boolean> {
        const { count } = await transaction.emailVerification.updateMany({
            where: {
                id: verificationId,
                expiresAt: { gt: now },
                failedAttempts: { lt: maxFailedAttempts },
            },
            data: {
                failedAttempts: { increment: 1 },
            },
        });

        return count === 1;
    }

    delete(id: string, transaction: Prisma.TransactionClient) {
        return transaction.emailVerification.delete({
            where: { id },
        });
    }
}
