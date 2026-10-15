import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ActivityPageContent } from '@/features/activity';

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

export default function AccountActivityPage() {
  return <ActivityPageContent />;
}
