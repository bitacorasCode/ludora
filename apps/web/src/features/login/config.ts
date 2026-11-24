import { AUTH_ERROR_CODES } from '@ludora/contracts/auth';

export const LOGIN_FORM_ID = 'login-form';

export const LOGIN_ERROR_CODES = {
    invalidCredentials: AUTH_ERROR_CODES.invalidCredentials,
} as const;
