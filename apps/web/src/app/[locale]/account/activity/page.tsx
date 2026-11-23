import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { ActivityPageContent } from '@/features/activity';

import { AccountAccess } from '../_components/account-access';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/activity'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Activity' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function AccountActivityPage({
  params,
}: PageProps<'/[locale]/account/activity'>) {
  const { locale } = await params;

  return (
    <>
      <ActivityPageContent />
      <Suspense fallback={null}>
        <AccountAccess locale={locale} />
      </Suspense>
    </>
  );
}
