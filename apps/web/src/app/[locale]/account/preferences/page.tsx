import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { PreferencesPageContent } from '@/features/preferences';

import { AccountAccess } from '../_components/account-access';

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

export default async function AccountPreferencesPage({
  params,
}: PageProps<'/[locale]/account/preferences'>) {
  const { locale } = await params;

  return (
    <>
      <PreferencesPageContent />
      <Suspense fallback={null}>
        <AccountAccess locale={locale} />
      </Suspense>
    </>
  );
}
