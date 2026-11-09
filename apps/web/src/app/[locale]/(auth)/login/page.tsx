import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LoginPageContent } from '@/features/login';

import { GuestOnly } from '../../_components/auth/guest-only';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/login'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Login' });

  return { title: t('title'), description: t('description') };
}

export default async function LoginPage({
  params,
}: PageProps<'/[locale]/login'>) {
  const { locale } = await params;

  return (
    <GuestOnly locale={locale}>
      <LoginPageContent />
    </GuestOnly>
  );
}
