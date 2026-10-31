import { z } from 'zod';

const MIN_TCP_PORT = 1;
const MAX_TCP_PORT = 65_535;
const SMTP_SECURE_VALUES = {
    enabled: 'true',
    disabled: 'false',
} as const;

export const SMTP_TIMEOUT_MS = 10_000;

export const mailConfigSchema = z.object({
    host: z.string().trim().min(1),
    port: z.coerce.number().int().min(MIN_TCP_PORT).max(MAX_TCP_PORT),
    secure: z
        .enum([SMTP_SECURE_VALUES.enabled, SMTP_SECURE_VALUES.disabled])
        .transform((value) => value === SMTP_SECURE_VALUES.enabled),
    from: z.string().trim().min(1),
});
