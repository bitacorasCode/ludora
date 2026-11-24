import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import type { PasswordRecoveryJob } from '../../generated/prisma/client.js';
import { AUTH_MAIL_QUEUE_LOGS } from '../constants/mail-queue.js';
import { PASSWORD_RECOVERY_QUEUE } from '../constants/password-reset.js';
import { PasswordRecoveryJobRepository } from '../repositories/password-recovery-job.repository.js';
import { PasswordRecoveryService } from '../services/password-recovery.service.js';
import { PasswordRecoveryWorker } from './password-recovery.worker.js';

describe('PasswordRecoveryWorker', () => {
    let worker: PasswordRecoveryWorker;

    const now = new Date('2026-11-21T12:00:00.000Z');
    const job: PasswordRecoveryJob & { readySince: Date } = {
        id: 'd56aa89f-ac5f-4d65-a49d-3653442080bf',
        email: 'player@example.com',
        prepared: false,
        attempts: 1,
        availableAt: now,
        readySince: now,
        createdAt: now,
    };
    const { maxAgeMs, maxAttempts, pollIntervalMs, retryDelayMs } = PASSWORD_RECOVERY_QUEUE;
    const jobs = {
        claimNext: vi.fn<PasswordRecoveryJobRepository['claimNext']>(),
        retry: vi.fn<PasswordRecoveryJobRepository['retry']>(),
        remove: vi.fn<PasswordRecoveryJobRepository['remove']>(),
    };
    const recovery = { processRequest: vi.fn<PasswordRecoveryService['processRequest']>() };

    async function createWorker() {
        const module = await Test.createTestingModule({
            providers: [
                PasswordRecoveryWorker,
                { provide: PasswordRecoveryJobRepository, useValue: jobs },
                { provide: PasswordRecoveryService, useValue: recovery },
            ],
        }).compile();

        return module.get(PasswordRecoveryWorker);
    }

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(now);
        jobs.claimNext.mockResolvedValue(null);
        jobs.retry.mockResolvedValue(undefined);
        jobs.remove.mockResolvedValue(undefined);
        recovery.processRequest.mockResolvedValue(undefined);
        worker = await createWorker();
    });

    afterEach(async () => {
        await worker.onModuleDestroy();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('reschedules a failed delivery and completes it with a fresh worker', async () => {
        const warning = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        jobs.claimNext.mockResolvedValueOnce(job);
        recovery.processRequest.mockRejectedValueOnce(new Error(`Transport failed for ${job.email}`));

        worker.onApplicationBootstrap();
        await vi.advanceTimersByTimeAsync(pollIntervalMs);

        const retryAt = new Date(now.getTime() + pollIntervalMs + retryDelayMs);
        expect(jobs.retry).toHaveBeenCalledExactlyOnceWith(job, retryAt);
        expect(jobs.remove).not.toHaveBeenCalled();
        expect(warning).toHaveBeenCalledExactlyOnceWith(AUTH_MAIL_QUEUE_LOGS.retryScheduled);

        await worker.onModuleDestroy();
        vi.setSystemTime(retryAt);
        const retriedJob = { ...job, prepared: true, attempts: job.attempts + 1 };
        jobs.claimNext.mockResolvedValueOnce(retriedJob);
        worker = await createWorker();
        worker.onApplicationBootstrap();
        await vi.advanceTimersByTimeAsync(pollIntervalMs);

        expect(recovery.processRequest).toHaveBeenLastCalledWith(retriedJob);
        expect(jobs.remove).toHaveBeenCalledExactlyOnceWith(retriedJob);
        expect(jobs.retry).toHaveBeenCalledOnce();
    });

    it.each([
        { ...job, createdAt: new Date(now.getTime() - maxAgeMs) },
        { ...job, attempts: maxAttempts + 1 },
    ])('discards jobs past the age or attempt limit without calling delivery', async (staleJob) => {
        jobs.claimNext.mockResolvedValueOnce(staleJob);

        worker.onApplicationBootstrap();
        await vi.advanceTimersByTimeAsync(pollIntervalMs);

        expect(recovery.processRequest).not.toHaveBeenCalled();
        expect(jobs.retry).not.toHaveBeenCalled();
        expect(jobs.remove).toHaveBeenCalledExactlyOnceWith(staleJob);
    });
});
