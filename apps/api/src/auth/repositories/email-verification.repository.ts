import { Injectable } from '@nestjs/common';

import { SINGLE_RECORD_UPDATE_COUNT } from '../../common/constants/database.js';
import type { EmailVerification, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type CreateEmailVerificationData = Pick<
    EmailVerification,
    'id' | 'userId' | 'codeHash' | 'expiresAt' | 'lastSentAt'
>;

type ReserveAttemptData = {
    verificationId: string;
    now: Date;
    maxFailedAttempts: number;
};

type ReserveResendData = {
    verificationId: string;
    now: Date;
    resendBefore: Date;
};

type RenewVerificationCodeData = Pick<
    EmailVerification,
    'id' | 'codeHash' | 'expiresAt'
>;

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

    findPendingById(
        id: string,
        transaction: Prisma.TransactionClient = this.prisma,
    ) {
        return transaction.emailVerification.findUnique({
            where: {
                id,
                user: { emailVerifiedAt: null },
            },
        });
    }

    findPendingByUserId(
        userId: string,
        transaction: Prisma.TransactionClient = this.prisma,
    ) {
        return transaction.emailVerification.findUnique({
            where: {
                userId,
                user: { emailVerifiedAt: null },
            },
            select: {
                id: true,
                expiresAt: true,
                lastSentAt: true,
            },
        });
    }

    // Keep the row lock until the code is renewed in the same transaction.
    async reserveResend(
        { verificationId, now, resendBefore }: ReserveResendData,
        transaction: Prisma.TransactionClient,
    ): Promise<boolean> {
        const { count } = await transaction.emailVerification.updateMany({
            where: {
                id: verificationId,
                lastSentAt: { lte: resendBefore },
                user: { emailVerifiedAt: null },
            },
            data: { lastSentAt: now },
        });

        return count === SINGLE_RECORD_UPDATE_COUNT;
    }

    renewCode(
        { id, codeHash, expiresAt }: RenewVerificationCodeData,
        transaction: Prisma.TransactionClient,
    ) {
        return transaction.emailVerification.update({
            where: { id },
            data: {
                codeHash,
                expiresAt,
                failedAttempts: 0,
            },
            select: { id: true },
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

        return count === SINGLE_RECORD_UPDATE_COUNT;
    }

    delete(id: string, transaction: Prisma.TransactionClient) {
        return transaction.emailVerification.delete({
            where: { id },
        });
    }
}
