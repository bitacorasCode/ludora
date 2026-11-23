import { AUTH_MAIL_QUEUE } from '../constants/mail-queue.js';

export class MailJobPoller {
    private timer?: ReturnType<typeof setTimeout>;
    private activePoll?: Promise<void>;
    private stopping = false;

    constructor(
        private readonly processNext: () => Promise<boolean>,
        private readonly reportError: () => void,
    ) {}

    start(): void {
        this.timer = setTimeout(() => {
            this.activePoll = this.processBatch()
                .catch(() => this.reportError())
                .finally(() => {
                    if (!this.stopping) this.start();
                });
        }, AUTH_MAIL_QUEUE.pollIntervalMs);
        this.timer.unref();
    }

    async stop(): Promise<void> {
        this.stopping = true;
        clearTimeout(this.timer);
        await this.activePoll;
    }

    private async processBatch(): Promise<void> {
        for (let processed = 0; processed < AUTH_MAIL_QUEUE.batchSize && !this.stopping; processed += 1) {
            if (!(await this.processNext())) break;
        }
    }
}
