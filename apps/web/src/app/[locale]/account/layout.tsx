import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SessionActivity, SessionBoundary } from '@/components/auth';
import { NavigationGuardProvider } from '@/components/navigation';
import { Skeleton } from '@/components/ui';
import { AccountShell } from '@/features/account';
import { LogoutButton } from '@/features/logout';
import { OPERATION_STATUS } from '@/lib/actions';
import { getCurrentUserResult } from '@/lib/auth';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

async function AccountActions() {
  const session = await getCurrentUserResult();

  if (session.status === OPERATION_STATUS.error) return null;

  return (
    <>
      <SessionActivity key={session.data.id} />
      <LogoutButton />
    </>
  );
}

export default function AccountLayout({ children }: LayoutProps<'/[locale]/account'>) {
  const actions = (
    <div className='min-h-9'>
      <Suspense fallback={<Skeleton className='h-9 w-full' />}>
        <AccountActions />
      </Suspense>
    </div>
  );

  return (
    <SessionBoundary inAccount>
      <NavigationGuardProvider>
        <AccountShell actions={actions}>{children}</AccountShell>
      </NavigationGuardProvider>
    </SessionBoundary>
  );
}
