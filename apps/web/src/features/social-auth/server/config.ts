import 'server-only';

export const SOCIAL_AUTH_ENDPOINTS = {
    googleStart: '/auth/google/start',
    googleCallback: '/auth/google/callback',
    registrationContext: '/auth/oauth/registration-context',
    completeRegistration: '/auth/oauth/register',
} as const;
