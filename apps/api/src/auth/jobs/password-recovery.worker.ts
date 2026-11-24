import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';

import type { PasswordRecoveryJob } from '../../generated/prisma/client.js';
import { AUTH_MAIL_QUEUE_LOGS } from '../constants/mail-queue.js';
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

        this.poller.warnIfBacklogged(job.readySince, now, this.logger);
        await this.processJob(job);

        return true;
    }

    private async processJob(job: PasswordRecoveryJob): Promise<void> {
        const { maxAgeMs, maxAttempts, retryDelayMs } = PASSWORD_RECOVERY_QUEUE;
        const expiresAtMs = job.createdAt.getTime() + maxAgeMs;

        if (job.attempts > maxAttempts) {
            this.logger.error(AUTH_MAIL_QUEUE_LOGS.attemptsExhausted);
        } else if (Date.now() < expiresAtMs) {
            try {
                await this.recovery.processRequest(job);
            } catch {
                const retryAtMs = Date.now() + retryDelayMs;

                if (job.attempts < maxAttempts && retryAtMs < expiresAtMs) {
                    await this.jobs.retry(job, new Date(retryAtMs));
                    this.logger.warn(AUTH_MAIL_QUEUE_LOGS.retryScheduled);
                    return;
                }

                this.logger.error(
                    job.attempts === maxAttempts
                        ? AUTH_MAIL_QUEUE_LOGS.attemptsExhausted
                        : AUTH_MAIL_QUEUE_LOGS.retryPastDeadline,
                );
            }
        }

        await this.jobs.remove(job);
    }
}
