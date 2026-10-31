import { AUTH_ERROR_CODES } from '@ludora/security';

export const LOGIN_ERROR_CODES = {
    invalidCredentials: AUTH_ERROR_CODES.invalidCredentials,
} as const;
