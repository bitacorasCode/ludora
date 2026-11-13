import { z } from 'zod';

const MIN_TCP_PORT = 1;
const MAX_TCP_PORT = 65_535;

const SMTP_SECURE_VALUES = {
    enabled: 'true',
    disabled: 'false',
} as const;

export const MAIL_PROVIDER = {
    smtp: 'smtp',
    resend: 'resend',
} as const;

export const MAIL_TIMEOUT_MS = 10_000;

export const RESEND_API_URL = 'https://api.resend.com/emails';

export const mailProviderSchema = z.enum(MAIL_PROVIDER);

const senderSchema = z.string().trim().min(1);

export const smtpConfigSchema = z.object({
    host: z.string().trim().min(1),
    port: z.coerce.number().int().min(MIN_TCP_PORT).max(MAX_TCP_PORT),
    secure: z
        .enum([
            SMTP_SECURE_VALUES.enabled,
            SMTP_SECURE_VALUES.disabled,
        ])
        .transform((value) => value === SMTP_SECURE_VALUES.enabled),
    from: senderSchema,
});

export const resendConfigSchema = z.object({
    apiKey: z.string().trim().min(1),
    from: senderSchema,
});

export type ResendConfig = z.infer<typeof resendConfigSchema>;

export const resendSendResponseSchema = z.object({
    id: z.string().trim().min(1),
});

export const MAIL_ERRORS = {
    resendRejected: 'Resend rejected the email submission.',
    invalidResendResponse:
        'Resend did not return a valid email submission ID.',
} as const;