import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { UserSettingsPageContent, UserSettingsPageHeading } from '@/features/user-settings';

import { AccountAccess } from '../_components/account-access';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/settings'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'UserSettings' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function AccountSettingsPage({
  params,
}: PageProps<'/[locale]/account/settings'>) {
  const { locale } = await params;
  const fallback = <UserSettingsPageContent pending />;

  return (
    <>
      <UserSettingsPageHeading />
      <Suspense fallback={fallback}>
        <AccountAccess locale={locale} fallback={fallback}>
          {(user) => (
            <UserSettingsPageContent
              key={user.id}
              userId={user.id}
              email={user.email}
              hasPassword={user.hasPassword}
            />
          )}
        </AccountAccess>
      </Suspense>
    </>
  );
}
