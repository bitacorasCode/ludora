import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { RegisterPageContent } from '@/features/register';

import { GuestOnly } from '../../_components/auth/guest-only';

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

export default async function RegisterPage({
  params,
}: PageProps<'/[locale]/register'>) {
  const { locale } = await params;

  return (
    <GuestOnly locale={locale}>
      <RegisterPageContent />
    </GuestOnly>
  );
}
