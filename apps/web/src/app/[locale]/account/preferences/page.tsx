import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PreferencesPageContent } from '@/features/preferences';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/preferences'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Preferences' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function AccountPreferencesPage() {
  return <PreferencesPageContent />;
}
