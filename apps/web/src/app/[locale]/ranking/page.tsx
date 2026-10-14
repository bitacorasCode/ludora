import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { RankingPageContent } from '@/features/ranking';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/ranking'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Ranking' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function RankingPage() {
  return <RankingPageContent />;
}
