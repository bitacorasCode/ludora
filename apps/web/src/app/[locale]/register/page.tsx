import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { isLoggedIn } from '@/config/auth';
import { RegisterPageContent } from '@/features/register';
import { redirect } from '@/i18n/navigation';

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

  if (isLoggedIn) {
    redirect({ href: '/', locale });
  }

  return <RegisterPageContent />;
}
