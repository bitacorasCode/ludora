import 'server-only';

export { SOCIAL_AUTH_ENDPOINTS } from './config';
export {
    createOAuthFlowCookie,
    deleteOAuthRegistrationCookie,
    getOAuthRegistrationCookie,
} from './cookies';
export { handleGoogleCallback } from './google-callback';
export { getOAuthRegistrationContext } from './registration-context';
export {
    googleAuthorizationResponseSchema,
    socialRegistrationResponseSchema,
} from './schemas';
