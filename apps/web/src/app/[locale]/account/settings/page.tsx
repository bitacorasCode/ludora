import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { APP_ROUTES } from '@/config/routes';
import { UserSettingsPageContent } from '@/features/user-settings';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth';

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
  const user = await getCurrentUser();

  if (!user) return redirect({ href: APP_ROUTES.login, locale });

  return <UserSettingsPageContent key={user.id} userId={user.id} email={user.email} />;
}
