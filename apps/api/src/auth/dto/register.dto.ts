import { z } from 'zod';

export const registerSchema = z.strictObject({
    nickname: z.string().trim().min(2),
    email: z
        .string()
        .trim()
        .toLowerCase()
        .pipe(z.email()),
    password: z.string().min(8),
});

export type RegisterDto = z.infer<typeof registerSchema>;