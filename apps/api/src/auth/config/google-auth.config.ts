import { parseHttpUrl } from '@ludora/security/server';
import { registerAs } from '@nestjs/config';
import { z } from 'zod';

export const GOOGLE_OAUTH = {
    issuer: 'https://accounts.google.com',
    scope: 'openid email profile',
    codeChallengeMethod: 'S256',
    requestTimeoutSeconds: 10,
} as const;

const googleAuthEnvironmentSchema = z.object({
    GOOGLE_CLIENT_ID: z.string().trim().min(1),
    GOOGLE_CLIENT_SECRET: z.string().trim().min(1),
    GOOGLE_REDIRECT_URI: z.string().trim().min(1),
});

export const googleAuthConfig = registerAs('googleAuth', () => {
    const {
        GOOGLE_CLIENT_ID: clientId,
        GOOGLE_CLIENT_SECRET: clientSecret,
        GOOGLE_REDIRECT_URI: redirectUri,
    } = googleAuthEnvironmentSchema.parse(process.env);

    const redirectUrl = parseHttpUrl(
        redirectUri,
        process.env.NODE_ENV,
    );

    if (!redirectUrl || redirectUrl.search || redirectUrl.hash) {
        throw new Error(
            'GOOGLE_REDIRECT_URI must use HTTPS without credentials, query or fragment. HTTP is only allowed for loopback hosts in development or tests.',
        );
    }

    return {
        clientId,
        clientSecret,
        redirectUri,
    };
});