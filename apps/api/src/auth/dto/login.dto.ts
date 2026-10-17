import { z } from 'zod';

export const loginSchema = z.strictObject({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .pipe(z.email()),
    password: z.string().min(1),
});

export type LoginDto = z.infer<typeof loginSchema>;