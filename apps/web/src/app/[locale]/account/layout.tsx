import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { type ReactNode, Suspense } from 'react';

import { SessionBoundary } from '@/components/auth';
import { PageContainer, PageSection } from '@/components/layout';
import { APP_ROUTES } from '@/config/routes';
import { AccountContentSkeleton, AccountShell } from '@/features/account';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type AuthenticatedAccountProps = {
  children: ReactNode;
  locale: string;
};

async function AuthenticatedAccount({
  children,
  locale,
}: AuthenticatedAccountProps) {
  const user = await getCurrentUser();

  if (!user) {
    return redirect({
      href: APP_ROUTES.login,
      locale,
    });
  }

  return (
    <SessionBoundary key={user.id}>
      <AccountShell>{children}</AccountShell>
    </SessionBoundary>
  );
}

export default async function AccountLayout({
  children,
  params,
}: LayoutProps<'/[locale]/account'>) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: 'Account',
  });

  return (
    <Suspense
      fallback={
        <PageContainer>
          <PageSection>
            <AccountContentSkeleton label={t('loading')} />
          </PageSection>
        </PageContainer>
      }
    >
      <AuthenticatedAccount locale={locale}>{children}</AuthenticatedAccount>
    </Suspense>
  );
}
