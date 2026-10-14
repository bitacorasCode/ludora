import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { RecoveryRequestPageContent } from '@/features/password-recovery';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/forgot-password'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'PasswordRecovery.request' });

  return { title: t('title'), description: t('description') };
}

export default function ForgotPasswordPage() {
  return <RecoveryRequestPageContent />;
}
