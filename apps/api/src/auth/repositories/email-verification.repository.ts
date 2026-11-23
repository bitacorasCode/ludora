import { Injectable } from '@nestjs/common';

import { SINGLE_RECORD_COUNT } from '../../common/constants/index.js';
import type { EmailVerification, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type VerificationDeliveryData = Pick<
    EmailVerification,
    'codeHash' | 'expiresAt' | 'deliveryId' | 'deliveryAvailableAt' | 'deliveryAttempts'
>;

type CreateEmailVerificationData = VerificationDeliveryData & Pick<
    EmailVerification,
    'id' | 'userId' | 'lastSentAt'
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

type RenewVerificationCodeData = VerificationDeliveryData & Pick<EmailVerification, 'id'>;

type DeliveryClaim = Pick<
    EmailVerification,
    'id' | 'deliveryAttempts'
> & { deliveryId: string };

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
            select: { lastSentAt: true },
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

        return count === SINGLE_RECORD_COUNT;
    }

    renewCode(
        { id, ...delivery }: RenewVerificationCodeData,
        transaction: Prisma.TransactionClient,
    ) {
        return transaction.emailVerification.update({
            where: { id },
            data: {
                ...delivery,
                failedAttempts: 0,
            },
            select: { id: true },
        });
    }

    async claimNextDelivery(now: Date, leaseExpiresAt: Date) {
        const candidate = await this.prisma.emailVerification.findFirst({
            where: { deliveryAvailableAt: { lte: now } },
            orderBy: [{ deliveryAvailableAt: 'asc' }, { id: 'asc' }],
            select: { id: true, deliveryId: true, deliveryAttempts: true, expiresAt: true },
        });

        if (!candidate?.deliveryId) return null;

        const { id, deliveryId, deliveryAttempts, expiresAt } = candidate;
        const { count } = await this.prisma.emailVerification.updateMany({
            where: { id, deliveryId, deliveryAttempts, deliveryAvailableAt: { lte: now } },
            data: { deliveryAttempts: { increment: 1 }, deliveryAvailableAt: leaseExpiresAt },
        });

        return count === SINGLE_RECORD_COUNT
            ? { id, deliveryId, deliveryAttempts: deliveryAttempts + 1, expiresAt }
            : null;
    }

    findClaimedDelivery({ id, deliveryId, deliveryAttempts }: DeliveryClaim, now: Date) {
        return this.prisma.emailVerification.findUnique({
            where: {
                id,
                deliveryId,
                deliveryAttempts,
                deliveryAvailableAt: { gt: now },
                expiresAt: { gt: now },
                user: { emailVerifiedAt: null },
            },
            select: { codeHash: true, user: { select: { email: true } } },
        });
    }

    async setDeliveryAvailability(claim: DeliveryClaim, availableAt: Date | null): Promise<void> {
        const { id, deliveryId, deliveryAttempts } = claim;
        await this.prisma.emailVerification.updateMany({
            where: { id, deliveryId, deliveryAttempts },
            data: { deliveryAvailableAt: availableAt },
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

        return count === SINGLE_RECORD_COUNT;
    }

    delete(id: string, transaction: Prisma.TransactionClient) {
        return transaction.emailVerification.delete({
            where: { id },
        });
    }
}
