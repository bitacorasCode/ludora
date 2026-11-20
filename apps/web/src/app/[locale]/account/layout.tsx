import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { type ReactNode, Suspense } from 'react';

import { SessionBoundary } from '@/components/auth';
import { PageContainer, PageSection } from '@/components/layout';
import { AccountContentSkeleton, AccountShell } from '@/features/account';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

async function AccountFrame({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) return children;

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
      <AccountFrame>{children}</AccountFrame>
    </Suspense>
  );
}
