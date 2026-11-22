import type { Metadata } from 'next';
import { type ReactNode, Suspense } from 'react';

import { SessionBoundary } from '@/components/auth';
import { AccountShell } from '@/features/account';
import { getCurrentUser } from '@/lib/auth';

import { AccountFrameFallback } from './_components/account-frame-fallback';

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

export default function AccountLayout({ children }: LayoutProps<'/[locale]/account'>) {
  return (
    <Suspense fallback={<AccountFrameFallback />}>
      <AccountFrame>{children}</AccountFrame>
    </Suspense>
  );
}
