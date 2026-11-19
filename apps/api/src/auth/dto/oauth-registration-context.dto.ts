import { z } from 'zod';

import { completeOAuthRegistrationSchema } from './complete-oauth-registration.dto.js';

export const oauthRegistrationContextSchema = completeOAuthRegistrationSchema.pick({
    registrationToken: true,
});

export type OAuthRegistrationContextDto = z.infer<
    typeof oauthRegistrationContextSchema
>;
