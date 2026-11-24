import { APP_ROUTES } from '@/config/routes';

export const SESSION_REVISION_COOKIE_NAME = 'ludora_session_revision';

export const SESSION_EXPIRED_NOTICE = { param: 'sessionExpired', value: '1' } as const;

export const SESSION_EXPIRED_LOGIN_LOCATION = {
    pathname: APP_ROUTES.login,
    query: { [SESSION_EXPIRED_NOTICE.param]: SESSION_EXPIRED_NOTICE.value },
};
