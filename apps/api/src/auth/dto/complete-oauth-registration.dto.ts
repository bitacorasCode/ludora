import { z } from 'zod';

import { emailSchema } from '../schemas/email.schema.js';
import { registerSchema } from './register.dto.js';

export const completeOAuthRegistrationSchema = z.strictObject({
    registrationToken: z.string().min(1),
    nickname: registerSchema.shape.nickname,
    email: emailSchema.optional(),
});

export type CompleteOAuthRegistrationDto = z.infer<
    typeof completeOAuthRegistrationSchema
>;
