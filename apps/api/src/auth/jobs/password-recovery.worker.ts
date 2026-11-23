import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';

import type { PasswordRecoveryJob } from '../../generated/prisma/client.js';
import { PASSWORD_RECOVERY_QUEUE } from '../constants/password-reset.js';
import { PasswordRecoveryJobRepository } from '../repositories/password-recovery-job.repository.js';
import { PasswordRecoveryService } from '../services/password-recovery.service.js';
import { MailJobPoller } from './mail-job-poller.js';

@Injectable()
export class PasswordRecoveryWorker implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(PasswordRecoveryWorker.name);
    private readonly poller = new MailJobPoller(
        () => this.processNext(),
        () => this.logger.error('Could not process the password recovery queue.'),
    );

    constructor(
        private readonly jobs: PasswordRecoveryJobRepository,
        private readonly recovery: PasswordRecoveryService,
    ) {}

    onApplicationBootstrap(): void {
        this.poller.start();
    }

    onModuleDestroy(): Promise<void> {
        return this.poller.stop();
    }

    private async processNext(): Promise<boolean> {
        const now = new Date();
        const leaseExpiresAt = new Date(now.getTime() + PASSWORD_RECOVERY_QUEUE.leaseDurationMs);
        const job = await this.jobs.claimNext(now, leaseExpiresAt);

        if (!job) return false;

        await this.processJob(job);

        return true;
    }

    private async processJob(job: PasswordRecoveryJob): Promise<void> {
        const { maxAgeMs, maxAttempts, retryDelayMs } = PASSWORD_RECOVERY_QUEUE;
        const expiresAtMs = job.createdAt.getTime() + maxAgeMs;

        if (Date.now() < expiresAtMs && job.attempts <= maxAttempts) {
            try {
                await this.recovery.processRequest(job);
            } catch {
                this.logger.warn('Could not deliver a password recovery request.');
                const retryAtMs = Date.now() + retryDelayMs;

                if (job.attempts < maxAttempts && retryAtMs < expiresAtMs) {
                    await this.jobs.retry(job, new Date(retryAtMs));
                    return;
                }
            }
        }

        await this.jobs.remove(job);
    }
}
