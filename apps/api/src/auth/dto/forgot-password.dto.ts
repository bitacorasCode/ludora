import { z } from 'zod';

import { emailSchema } from '../schemas/email.schema.js';

export const forgotPasswordSchema = z.strictObject({
    email: emailSchema,
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
