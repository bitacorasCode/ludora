import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LoginPageContent } from '@/features/login';
import { getSocialAuthCallbackError } from '@/features/social-auth/locations';

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
    <GuestOnly locale={locale}>
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
