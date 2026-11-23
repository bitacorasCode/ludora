import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { ProfilePageContent, ProfilePageHeading, ProfileSkeleton } from '@/features/profile';

import { AccountAccess } from '../_components/account-access';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/profile'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Profile' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function AccountProfilePage({
  params,
}: PageProps<'/[locale]/account/profile'>) {
  const { locale } = await params;
  const fallback = <ProfileSkeleton />;

  return (
    <>
      <ProfilePageHeading />
      <Suspense fallback={fallback}>
        <AccountAccess locale={locale} fallback={fallback}>
          {(user) => (
            <ProfilePageContent
              key={user.id}
              userId={user.id}
              nickname={user.nickname}
            />
          )}
        </AccountAccess>
      </Suspense>
    </>
  );
}
