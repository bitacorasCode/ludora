import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ProfilePageContent } from '@/features/profile';

import { AccountAccess } from '../_components/account-access';
import ProfileLoading from './loading';

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

  return (
    <AccountAccess locale={locale} fallback={<ProfileLoading />}>
      {(user) => (
        <ProfilePageContent
          key={user.id}
          userId={user.id}
          nickname={user.nickname}
        />
      )}
    </AccountAccess>
  );
}
