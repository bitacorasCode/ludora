import { Suspense } from 'react';

import { APP_ROUTES } from '@/config/routes';
import { ProfilePageHeading, ProfileSkeleton } from '@/features/profile';
import { redirect } from '@/i18n/navigation';

import { AccountAccess } from './_components/account-access';

export default async function AccountPage({
  params,
}: PageProps<'/[locale]/account'>) {
  const { locale } = await params;
  const fallback = <ProfileSkeleton />;

  return (
    <>
      <ProfilePageHeading />
      <Suspense fallback={fallback}>
        <AccountAccess locale={locale} fallback={fallback}>
          {() => redirect({ href: APP_ROUTES.accountProfile, locale })}
        </AccountAccess>
      </Suspense>
    </>
  );
}
