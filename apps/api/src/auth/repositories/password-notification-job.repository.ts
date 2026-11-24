import { Injectable } from '@nestjs/common';

import { SINGLE_RECORD_COUNT } from '../../common/constants/index.js';
import type { PasswordNotificationJob, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type JobClaim = Pick<PasswordNotificationJob, 'id' | 'attempts'>;

@Injectable()
export class PasswordNotificationJobRepository {
    constructor(private readonly prisma: PrismaService) {}

    async enqueue(userId: string, isFirstPassword: boolean, transaction: Prisma.TransactionClient): Promise<void> {
        await transaction.passwordNotificationJob.create({ data: { userId, isFirstPassword } });
    }

    async claimNext(now: Date, leaseExpiresAt: Date) {
        const candidate = await this.prisma.passwordNotificationJob.findFirst({
            where: { availableAt: { lte: now } },
            orderBy: [{ availableAt: 'asc' }, { id: 'asc' }],
            select: {
                id: true,
                attempts: true,
                isFirstPassword: true,
                createdAt: true,
                availableAt: true,
                user: { select: { email: true } },
            },
        });

        if (!candidate) return null;

        const { availableAt: readySince, ...job } = candidate;
        const { id, attempts } = job;
        const { count } = await this.prisma.passwordNotificationJob.updateMany({
            where: { id, attempts, availableAt: { lte: now } },
            data: { availableAt: leaseExpiresAt, attempts: { increment: 1 } },
        });

        return count === SINGLE_RECORD_COUNT ? { ...job, readySince, attempts: attempts + 1 } : null;
    }

    async retry({ id, attempts }: JobClaim, availableAt: Date): Promise<void> {
        await this.prisma.passwordNotificationJob.updateMany({
            where: { id, attempts },
            data: { availableAt },
        });
    }

    async remove({ id, attempts }: JobClaim): Promise<void> {
        await this.prisma.passwordNotificationJob.deleteMany({ where: { id, attempts } });
    }
}
