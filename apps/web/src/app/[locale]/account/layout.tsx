import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SessionActivity, SessionBoundary } from '@/components/auth';
import { Skeleton } from '@/components/ui';
import { AccountShell } from '@/features/account';
import { LogoutButton } from '@/features/logout';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

async function AccountActions() {
  const user = await getCurrentUser();

  if (!user) return null;

  return (
    <>
      <SessionActivity key={user.id} />
      <LogoutButton />
    </>
  );
}

export default function AccountLayout({ children }: LayoutProps<'/[locale]/account'>) {
  const actions = (
    <div className='min-h-8'>
      <Suspense fallback={<Skeleton className='h-8 w-full' />}>
        <AccountActions />
      </Suspense>
    </div>
  );

  return (
    <SessionBoundary trackActivity={false}>
      <AccountShell actions={actions}>{children}</AccountShell>
    </SessionBoundary>
  );
}
