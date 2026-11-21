import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';

import type { PasswordRecoveryJob } from '../../generated/prisma/client.js';
import { PASSWORD_RECOVERY_QUEUE } from '../constants/password-reset.js';
import { PasswordRecoveryJobRepository } from '../repositories/password-recovery-job.repository.js';
import { PasswordRecoveryService } from '../services/password-recovery.service.js';

@Injectable()
export class PasswordRecoveryWorker implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(PasswordRecoveryWorker.name);
    private timer?: ReturnType<typeof setTimeout>;
    private activePoll?: Promise<void>;
    private stopping = false;

    constructor(
        private readonly jobs: PasswordRecoveryJobRepository,
        private readonly recovery: PasswordRecoveryService,
    ) {}

    onApplicationBootstrap(): void {
        this.schedulePoll();
    }

    async onModuleDestroy(): Promise<void> {
        this.stopping = true;
        clearTimeout(this.timer);
        await this.activePoll;
    }

    private schedulePoll(): void {
        this.timer = setTimeout(() => {
            this.activePoll = this.processBatch()
                .catch(() => this.logger.error('Could not process the password recovery queue.'))
                .finally(() => {
                    if (!this.stopping) this.schedulePoll();
                });
        }, PASSWORD_RECOVERY_QUEUE.pollIntervalMs);
        this.timer.unref();
    }

    private async processBatch(): Promise<void> {
        const { batchSize, leaseDurationMs } = PASSWORD_RECOVERY_QUEUE;

        for (let processed = 0; processed < batchSize && !this.stopping; processed += 1) {
            const now = new Date();
            const job = await this.jobs.claimNext(now, new Date(now.getTime() + leaseDurationMs));

            if (!job) break;

            await this.processJob(job);
        }
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
