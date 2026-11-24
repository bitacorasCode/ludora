import { PASSWORD_FORM_MODE } from '@ludora/contracts/auth';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { LoginFormCard, LoginFormSkeleton, LoginPageContent } from '@/features/login';
import { PASSWORD_RECOVERY_COMPLETION_PARAM } from '@/features/password-recovery/schema';
import { getSocialAuthCallbackError } from '@/features/social-auth/locations';
import { SESSION_EXPIRED_NOTICE } from '@/lib/session/constants';

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
  searchParams,
}: PageProps<'/[locale]/login'>) {
  const { locale } = await params;

  return (
    <Suspense fallback={<LoginFormCard />}>
      <LoginContent locale={locale} searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({
  locale,
  searchParams,
}: Pick<PageProps<'/[locale]/login'>, 'searchParams'> & { locale: string }) {
  const query = await searchParams;
  const socialAuthError = getSocialAuthCallbackError(query);
  const passwordUpdated = query[PASSWORD_RECOVERY_COMPLETION_PARAM];
  const completedPasswordMode = passwordUpdated === PASSWORD_FORM_MODE.create
    || passwordUpdated === PASSWORD_FORM_MODE.reset
    ? passwordUpdated
    : undefined;
  const sessionExpired = query[SESSION_EXPIRED_NOTICE.param] === SESSION_EXPIRED_NOTICE.value;
  const notice = { completedPasswordMode, sessionExpired };

  return (
    <GuestOnly
      locale={locale}
      fallback={<LoginFormSkeleton {...notice} />}
    >
      <LoginPageContent
        socialAuthError={socialAuthError ?? undefined}
        {...notice}
      />
    </GuestOnly>
  );
}
