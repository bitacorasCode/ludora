import 'server-only';

import { type ReactNode, Suspense } from 'react';

import { APP_ROUTES } from '@/config/routes';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getRefreshToken } from '@/lib/session';

import { SessionRecovery } from './session-recovery';

type GuestOnlyProps = {
  children: ReactNode;
  fallback?: ReactNode;
  locale: string;
  redirectTo?: string;
};

async function GuestOnlyContent({
  children,
  fallback = null,
  locale,
  redirectTo = APP_ROUTES.home,
}: GuestOnlyProps) {
  const user = await getCurrentUser();

  if (user) {
    return redirect({ href: redirectTo, locale });
  }

  if (await getRefreshToken()) {
    return <SessionRecovery fallback={fallback} />;
  }

  return children;
}

export function GuestOnly(props: GuestOnlyProps) {
  return (
    <Suspense fallback={props.fallback}>
      <GuestOnlyContent {...props} />
    </Suspense>
  );
}
