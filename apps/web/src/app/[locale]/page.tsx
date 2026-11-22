import { unstable_rethrow } from 'next/navigation';
import { Suspense } from 'react';

import { HomePageContent } from '@/features/home';
import { getCurrentUser } from '@/lib/auth';
import { getRefreshToken } from '@/lib/session';

import { SessionRecovery } from './_components/auth/session-recovery';

async function HomeSessionRecovery() {
  if (!(await getRefreshToken())) return null;

  try {
    if (await getCurrentUser()) return null;
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }

  return <SessionRecovery />;
}

export default function Home() {
  return (
    <>
      <HomePageContent />
      <Suspense fallback={null}>
        <HomeSessionRecovery />
      </Suspense>
    </>
  );
}
