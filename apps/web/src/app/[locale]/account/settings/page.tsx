import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { UserSettingsPageContent } from '@/features/user-settings';

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

export default function AccountSettingsPage() {
  return <UserSettingsPageContent />;
}
