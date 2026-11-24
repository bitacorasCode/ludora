import { AUTH_VALIDATION, normalizeNickname } from '@ludora/contracts/auth';
import { z } from 'zod';

import { emailSchema } from '../schemas/email.schema.js';

export const registerSchema = z.strictObject({
    nickname: z.string().overwrite(normalizeNickname).min(AUTH_VALIDATION.nicknameMinLength),
    email: emailSchema,
    password: z.string().min(AUTH_VALIDATION.passwordMinLength),
});

export type RegisterDto = z.infer<typeof registerSchema>;
