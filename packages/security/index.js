export {
    AUTH_ERROR_CODES,
    AUTH_NEXT_STEP,
    AUTH_VALIDATION,
    DIGITS_PATTERN,
    EMAIL_VERIFICATION_CODE_LENGTH,
    PASSWORD_FORM_MODE,
} from '@ludora/contracts/auth';

export const HEX_64_PATTERN = /^[a-f0-9]{64}$/i;

export const INTERNAL_REQUEST_HEADERS = Object.freeze({
    secret: 'x-ludora-internal-key',
    clientIp: 'x-ludora-client-ip',
});

export const ACCESS_TOKEN_TTL_SECONDS = 30 * 60;
export const SESSION_ACTIVITY_INTERVAL_SECONDS = 300;
