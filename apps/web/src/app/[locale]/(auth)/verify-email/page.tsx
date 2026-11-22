import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import { APP_ROUTES } from '@/config/routes';
import { EmailVerificationPageContent } from '@/features/email-verification';
import { EMAIL_VERIFICATION_DELIVERY } from '@/features/email-verification/config';
import { getVerificationWaitSeconds } from '@/features/email-verification/server/get-verification-wait-seconds';
import { redirect } from '@/i18n/navigation';

import { AuthFormSkeleton } from '../../_components/auth/auth-form-skeleton';
import { GuestOnly } from '../../_components/auth/guest-only';

const VERIFICATION_PLACEHOLDER_FIELDS = 1;

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/verify-email'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: 'EmailVerification',
  });

  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

async function VerificationContent({
  searchParams,
  locale,
}: Pick<PageProps<'/[locale]/verify-email'>, 'searchParams'> & {
  locale: string;
}) {
  const { verificationId, delivery, resendAvailableAt } = await searchParams;
  const validation = z.uuid().safeParse(verificationId);

  if (!validation.success) {
    return redirect({ href: APP_ROUTES.register, locale });
  }

  const initialWaitSeconds =
    await getVerificationWaitSeconds(resendAvailableAt);

  return (
    <EmailVerificationPageContent
      key={validation.data}
      verificationId={validation.data}
      initialWaitSeconds={initialWaitSeconds}
      deliveryUnconfirmed={delivery === EMAIL_VERIFICATION_DELIVERY.unconfirmed}
    />
  );
}

export default async function VerifyEmailPage({
  params,
  searchParams,
}: PageProps<'/[locale]/verify-email'>) {
  const { locale } = await params;

  return (
    <GuestOnly
      locale={locale}
      redirectTo={APP_ROUTES.accountProfile}
      fallback={<AuthFormSkeleton fields={VERIFICATION_PLACEHOLDER_FIELDS} />}
    >
      <VerificationContent searchParams={searchParams} locale={locale} />
    </GuestOnly>
  );
}
