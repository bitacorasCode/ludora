import { z } from 'zod';

export const SMTP_TIMEOUT_MS = 10_000;

export const mailConfigSchema = z.object({
    host: z.string().trim().min(1),
    port: z.coerce.number().int().min(1).max(65535),
    secure: z
        .enum(['true', 'false'])
        .transform((value) => value === 'true'),
    from: z.string().trim().min(1),
});