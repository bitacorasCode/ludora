import { z } from 'zod';

import { emailSchema } from '../schemas/email.schema.js';

export const loginSchema = z.strictObject({
    email: emailSchema,
    password: z.string().min(1),
});

export type LoginDto = z.infer<typeof loginSchema>;
