import 'server-only';

import type { ReactNode } from 'react';

import { APP_ROUTES } from '@/config/routes';
import { redirect } from '@/i18n/navigation';
import { type CurrentUser, getCurrentUser } from '@/lib/auth';
import { getRefreshToken } from '@/lib/session';

import { SessionRecovery } from '../../_components/auth/session-recovery';

type AccountAccessProps = {
  children: (user: CurrentUser) => ReactNode;
  locale: string;
};

export async function AccountAccess({ children, locale }: AccountAccessProps) {
  const user = await getCurrentUser();

  if (user) return children(user);

  if (await getRefreshToken()) {
    return <SessionRecovery />;
  }

  return redirect({ href: APP_ROUTES.login, locale });
}
