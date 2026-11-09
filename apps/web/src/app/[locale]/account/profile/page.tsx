import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { APP_ROUTES } from '@/config/routes';
import { ProfilePageContent } from '@/features/profile';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth';

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
  const user = await getCurrentUser();

  if (!user) {
    return redirect({
      href: APP_ROUTES.login,
      locale,
    });
  }

  return (
    <ProfilePageContent
      key={user.id}
      userId={user.id}
      nickname={user.nickname}
    />
  );
}
