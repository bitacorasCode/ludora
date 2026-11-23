import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

import {
    MAIL_ERRORS,
    MAIL_PROVIDER,
    MAIL_TIMEOUT_MS,
    mailProviderSchema,
    RESEND_API_URL,
    type ResendConfig,
    resendConfigSchema,
    resendSendResponseSchema,
    smtpConfigSchema,
} from './config.js';

const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

export type SendMailInput = {
    to: string;
    subject: string;
    text: string;
    html?: string;
};

type MailTransport =
    | {
        provider: typeof MAIL_PROVIDER.smtp;
        transporter: Transporter;
    }
    | {
        provider: typeof MAIL_PROVIDER.resend;
        settings: ResendConfig;
    };

@Injectable()
export class MailService {
    private readonly transport: MailTransport;

    constructor(config: ConfigService) {
        const provider = mailProviderSchema.parse(
            config.get('MAIL_PROVIDER'),
        );

        if (provider === MAIL_PROVIDER.resend) {
            this.transport = {
                provider,
                settings: resendConfigSchema.parse({
                    apiKey: config.get('RESEND_API_KEY'),
                    from: config.get('MAIL_FROM'),
                }),
            };

            return;
        }

        const { host, port, secure, from } = smtpConfigSchema.parse({
            host: config.get('SMTP_HOST'),
            port: config.get('SMTP_PORT'),
            secure: config.get('SMTP_SECURE'),
            from: config.get('MAIL_FROM'),
        });

        this.transport = {
            provider,
            transporter: createTransport(
                {
                    host,
                    port,
                    secure,
                    connectionTimeout: MAIL_TIMEOUT_MS,
                    greetingTimeout: MAIL_TIMEOUT_MS,
                    socketTimeout: MAIL_TIMEOUT_MS,
                    disableFileAccess: true,
                    disableUrlAccess: true,
                },
                { from },
            ),
        };
    }

    async send(message: SendMailInput, { idempotencyKey }: { idempotencyKey?: string } = {}): Promise<void> {
        if (this.transport.provider === MAIL_PROVIDER.smtp) {
            await this.transport.transporter.sendMail(message);

            return;
        }

        await this.sendWithResend(message, this.transport.settings, idempotencyKey);
    }

    private async sendWithResend(
        { to, subject, text, html }: SendMailInput,
        { apiKey, from }: ResendConfig,
        idempotencyKey?: string,
    ): Promise<void> {
        const response = await fetch(RESEND_API_URL, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
                ...(idempotencyKey && { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey }),
            },
            body: JSON.stringify({
                from,
                to: [to],
                subject,
                text,
                html,
            }),
            signal: AbortSignal.timeout(MAIL_TIMEOUT_MS),
        });

        if (!response.ok) {
            await response.body?.cancel();

            throw new Error(
                `${MAIL_ERRORS.resendRejected} HTTP ${response.status}.`,
            );
        }

        const payload: unknown = await response.json();
        const result = resendSendResponseSchema.safeParse(payload);

        if (!result.success) {
            throw new Error(MAIL_ERRORS.invalidResendResponse);
        }
    }
}
