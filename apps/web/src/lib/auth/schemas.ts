import 'server-only';

import { z } from 'zod';

import { AUTH_NEXT_STEP } from './constants';

export const authResponseSchema = z.object({
    accessToken: z.string().min(1),
});

const emailVerificationDetailsSchema = z.object({
    id: z.uuid(),
    expiresAt: z.iso.datetime(),
    resendAvailableAt: z.iso.datetime(),
});

export const emailVerificationResponseSchema = z.object({
    verification: emailVerificationDetailsSchema.extend({
        emailSent: z.boolean(),
    }),
});

export const loginResponseSchema = z.discriminatedUnion('nextStep', [
    authResponseSchema.extend({
        nextStep: z.literal(AUTH_NEXT_STEP.authenticated),
    }),
    z.object({
        nextStep: z.literal(AUTH_NEXT_STEP.verifyEmail),
        verification: emailVerificationDetailsSchema,
    }),
]);
