import { z } from 'zod';

import { AuthProvider } from '../../generated/prisma/client.js';
import { emailSchema } from './email.schema.js';

export const externalIdentitySchema = z.object({
    provider: z.enum(AuthProvider),
    providerUserId: z.string().min(1),
    email: emailSchema.nullable(),
    emailVerified: z.boolean(),
});

export type ExternalIdentity = z.infer<typeof externalIdentitySchema>;
