import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { isLoggedIn } from '@/config/auth';
import { ProfilePageContent } from '@/features';
import { previewProfile } from '@/features/profile/config';
import { redirect } from '@/i18n/navigation';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/profile'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Profile' });

  return {
    title: `${t('title')} | Ludora`,
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function ProfilePage({
  params,
}: PageProps<'/[locale]/profile'>) {
  const { locale } = await params;

  if (!isLoggedIn) {
    redirect({ href: '/login', locale });
  }

  return <ProfilePageContent profile={previewProfile} />;
}
