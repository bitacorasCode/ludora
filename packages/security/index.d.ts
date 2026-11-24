export {
    AUTH_ERROR_CODES,
    AUTH_NEXT_STEP,
    AUTH_VALIDATION,
    DIGITS_PATTERN,
    EMAIL_VERIFICATION_CODE_LENGTH,
    PASSWORD_FORM_MODE,
} from '@ludora/contracts/auth';
export type { PasswordFormMode } from '@ludora/contracts/auth';

export declare const HEX_64_PATTERN: RegExp;

export declare const INTERNAL_REQUEST_HEADERS: Readonly<{
    secret: string;
    clientIp: string;
}>;

export declare const ACCESS_TOKEN_TTL_SECONDS: number;
export declare const SESSION_ACTIVITY_INTERVAL_SECONDS: number;
