import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LoginPageContent } from '@/features/login';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/login'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Login' });

  return { title: t('title'), description: t('description') };
}

export default function LoginPage() {
  return <LoginPageContent />;
}
