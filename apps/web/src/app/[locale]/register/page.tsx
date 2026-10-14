import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { RegisterPageContent } from '@/features';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/register'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Register' });

  return {
    title: t('title'),
    description: t('metadataDescription'),
  };
}

export default function RegisterPage() {
  return <RegisterPageContent />;
}
