import { AUTH_VALIDATION } from '@ludora/contracts/auth';
import { z } from 'zod';

export const resetPasswordSchema = z.strictObject({
    token: z.base64url().min(1),
    password: z.string().min(AUTH_VALIDATION.passwordMinLength),
});

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
