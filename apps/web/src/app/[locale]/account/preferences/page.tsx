import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PreferencesPageContent } from '@/features/preferences';

import { AccountAccess } from '../_components/account-access';
import PreferencesLoading from './loading';

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
    <AccountAccess locale={locale} fallback={<PreferencesLoading />}>
      {() => <PreferencesPageContent />}
    </AccountAccess>
  );
}
