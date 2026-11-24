import { Injectable } from '@nestjs/common';

import { SINGLE_RECORD_COUNT } from '../../common/constants/index.js';
import type { PasswordRecoveryJob, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type JobClaim = Pick<PasswordRecoveryJob, 'id' | 'attempts'>;

@Injectable()
export class PasswordRecoveryJobRepository {
    constructor(private readonly prisma: PrismaService) {}

    async enqueue(email: string): Promise<void> {
        await this.prisma.passwordRecoveryJob.create({ data: { email } });
    }

    async claimNext(now: Date, leaseExpiresAt: Date) {
        const job = await this.prisma.passwordRecoveryJob.findFirst({
            where: { availableAt: { lte: now } },
            orderBy: [{ availableAt: 'asc' }, { id: 'asc' }],
        });

        if (!job) return null;

        const { id, attempts } = job;
        const { count } = await this.prisma.passwordRecoveryJob.updateMany({
            where: { id, attempts, availableAt: { lte: now } },
            data: { availableAt: leaseExpiresAt, attempts: { increment: 1 } },
        });

        return count === SINGLE_RECORD_COUNT
            ? { ...job, readySince: job.availableAt, availableAt: leaseExpiresAt, attempts: attempts + 1 }
            : null;
    }

    async markPrepared(
        { id, attempts }: JobClaim,
        transaction: Prisma.TransactionClient,
    ): Promise<boolean> {
        const { count } = await transaction.passwordRecoveryJob.updateMany({
            where: { id, attempts, prepared: false },
            data: { prepared: true },
        });

        return count === SINGLE_RECORD_COUNT;
    }

    async retry({ id, attempts }: JobClaim, availableAt: Date): Promise<void> {
        await this.prisma.passwordRecoveryJob.updateMany({
            where: { id, attempts },
            data: { availableAt },
        });
    }

    async remove({ id, attempts }: JobClaim): Promise<void> {
        await this.prisma.passwordRecoveryJob.deleteMany({ where: { id, attempts } });
    }
}
