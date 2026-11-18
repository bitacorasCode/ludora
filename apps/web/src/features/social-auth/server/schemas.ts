import 'server-only';

import { parseHttpUrl } from '@ludora/security/server';
import { z } from 'zod';

const GOOGLE_AUTHORIZATION_ORIGIN = 'https://accounts.google.com';

const googleAuthorizationUrlSchema = z.string().refine(
    (value) => {
        const url = parseHttpUrl(value, process.env.NODE_ENV);

        return url?.origin === GOOGLE_AUTHORIZATION_ORIGIN;
    },
    'Invalid Google authorization URL.',
);

export const googleAuthorizationResponseSchema = z.object({
    authorizationUrl: googleAuthorizationUrlSchema,
    flowToken: z.string().min(1),
    expiresAt: z.iso.datetime(),
});
