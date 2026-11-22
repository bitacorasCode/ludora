import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LoginPageContent } from '@/features/login';
import { getSocialAuthCallbackError } from '@/features/social-auth/locations';

import { AuthFormSkeleton } from '../../_components/auth/auth-form-skeleton';
import { GuestOnly } from '../../_components/auth/guest-only';

const LOGIN_PLACEHOLDER_FIELDS = 2;

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
    <GuestOnly locale={locale} fallback={<AuthFormSkeleton fields={LOGIN_PLACEHOLDER_FIELDS} />}>
      <LoginContent searchParams={searchParams} />
    </GuestOnly>
  );
}

async function LoginContent({
  searchParams,
}: Pick<PageProps<'/[locale]/login'>, 'searchParams'>) {
  const socialAuthError = getSocialAuthCallbackError(await searchParams);

  return <LoginPageContent socialAuthError={socialAuthError ?? undefined} />;
}
