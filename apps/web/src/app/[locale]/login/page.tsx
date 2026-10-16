import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { isLoggedIn } from '@/config/auth';
import { LoginPageContent } from '@/features/login';
import { redirect } from '@/i18n/navigation';

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

  if (isLoggedIn) {
    redirect({ href: '/', locale });
  }

  return <LoginPageContent />;
}
