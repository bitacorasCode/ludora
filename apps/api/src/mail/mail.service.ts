import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

import { mailConfigSchema, SMTP_TIMEOUT_MS } from './config.js';

export type SendMailInput = {
    to: string;
    subject: string;
    text: string;
    html?: string;
};

@Injectable()
export class MailService {
    private readonly transporter: Transporter;

    constructor(config: ConfigService) {
        const { host, port, secure, from } = mailConfigSchema.parse({
            host: config.get('SMTP_HOST'),
            port: config.get('SMTP_PORT'),
            secure: config.get('SMTP_SECURE'),
            from: config.get('MAIL_FROM'),
        });

        this.transporter = createTransport(
            {
                host,
                port,
                secure,
                connectionTimeout: SMTP_TIMEOUT_MS,
                greetingTimeout: SMTP_TIMEOUT_MS,
                socketTimeout: SMTP_TIMEOUT_MS,
                disableFileAccess: true,
                disableUrlAccess: true,
            },
            {
                from,
            },
        );
    }

    async send({
        to,
        subject,
        text,
        html,
    }: SendMailInput): Promise<void> {
        await this.transporter.sendMail({
            to,
            subject,
            text,
            html,
        });
    }
}