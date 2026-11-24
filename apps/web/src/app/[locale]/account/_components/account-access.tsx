import 'server-only';

import type { ReactNode } from 'react';

import { APP_ROUTES } from '@/config/routes';
import { redirect } from '@/i18n/navigation';
import { isAuthenticationError, OPERATION_STATUS } from '@/lib/actions';
import { type CurrentUser, getCurrentUserResult } from '@/lib/auth';
import { getRefreshToken, getSessionToken } from '@/lib/session';
import { SESSION_EXPIRED_LOGIN_LOCATION } from '@/lib/session/constants';

import { SessionRecovery } from '../../_components/auth/session-recovery';

type AccountAccessProps = {
  children?: (user: CurrentUser) => ReactNode;
  fallback?: ReactNode;
  locale: string;
};

export async function AccountAccess({ children, fallback = null, locale }: AccountAccessProps) {
  const session = await getCurrentUserResult();

  if (session.status === OPERATION_STATUS.success) return children?.(session.data) ?? null;

  if (!isAuthenticationError(session.error)) {
    return <SessionRecovery fallback={fallback} inAccount initialError={session.error} />;
  }

  if (await getRefreshToken()) {
    return <SessionRecovery fallback={fallback} inAccount />;
  }

  const href = await getSessionToken() ? SESSION_EXPIRED_LOGIN_LOCATION : APP_ROUTES.login;
  return redirect({ href, locale });
}
