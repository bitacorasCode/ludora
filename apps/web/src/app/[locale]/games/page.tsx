import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { GamesPageContent } from '@/features';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/games'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Catalog' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function GamesPage() {
  return <GamesPageContent />;
}
