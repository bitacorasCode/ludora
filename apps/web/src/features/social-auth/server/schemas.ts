import 'server-only';

import { AUTH_NEXT_STEP } from '@ludora/security';
import { parseHttpUrl } from '@ludora/security/server';
import { z } from 'zod';

import { routing } from '@/i18n/routing';
import {
    authResponseSchema,
    emailVerificationResponseSchema,
    loginResponseSchema,
} from '@/lib/auth/schemas';

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

export const oauthFlowCookieSchema = z.object({
    flowToken: z.string().min(1),
    state: z.string().min(1),
    locale: z.enum(routing.locales),
});

export const oauthCallbackCookieSchema = z.object({
    id: z.uuid(),
    state: z.string().min(1),
    responseParameters: z.string().min(1),
});

export const oauthRegistrationCookieSchema = z.object({
    registrationToken: z.string().min(1),
    locale: z.enum(routing.locales),
});

export const oauthRegistrationContextSchema = z.object({
    email: z.email().nullable(),
    emailVerified: z.boolean(),
    expiresAt: z.iso.datetime(),
});

export const socialAuthCallbackResponseSchema = z.union([
    loginResponseSchema,
    z.object({
        nextStep: z.literal(AUTH_NEXT_STEP.completeRegistration),
        registration: oauthRegistrationContextSchema.extend({
            registrationToken: z.string().min(1),
        }),
    }),
]);

export const socialRegistrationResponseSchema = z.discriminatedUnion('nextStep', [
    authResponseSchema.extend({
        nextStep: z.literal(AUTH_NEXT_STEP.authenticated),
    }),
    emailVerificationResponseSchema.extend({
        nextStep: z.literal(AUTH_NEXT_STEP.verifyEmail),
    }),
]);
