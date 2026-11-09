import { AUTH_VALIDATION } from '@ludora/security';
import { z } from 'zod';

export const changePasswordSchema = z.strictObject({
    currentPassword: z.string().min(1),
    password: z.string().min(AUTH_VALIDATION.passwordMinLength),
});

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
