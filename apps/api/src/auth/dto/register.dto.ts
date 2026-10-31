import { AUTH_VALIDATION } from '@ludora/security';
import { z } from 'zod';

import { emailSchema } from '../schemas/email.schema.js';

export const registerSchema = z.strictObject({
    nickname: z.string().trim().min(AUTH_VALIDATION.nicknameMinLength),
    email: emailSchema,
    password: z.string().min(AUTH_VALIDATION.passwordMinLength),
});

export type RegisterDto = z.infer<typeof registerSchema>;
