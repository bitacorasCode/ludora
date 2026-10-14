import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ResetPasswordPageContent } from '@/features';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/reset-password'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'PasswordRecovery.reset' });

  return { title: t('title'), description: t('description') };
}

export default function ResetPasswordPage() {
  return <ResetPasswordPageContent />;
}
