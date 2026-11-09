import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import {
  passwordResetTokenSchema,
  ResetPasswordPageContent,
} from '@/features/password-recovery';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/reset-password'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'PasswordRecovery.reset' });

  return {
    title: t('title'),
    description: t('description'),
    referrer: 'no-referrer',
    robots: { index: false, follow: false },
  };
}

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<'/[locale]/reset-password'>) {
  const { token } = await searchParams;
  const validation = passwordResetTokenSchema.safeParse(token);

  return <ResetPasswordPageContent token={validation.success ? validation.data : null} />;
}
