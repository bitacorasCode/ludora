import type { ReactNode } from 'react';

import { PageContainer, PageSection } from '@/components/layout';

import { AccountNavigation } from './account-navigation';

export function AccountShell({ children }: { children: ReactNode }) {
  return (
    <PageContainer>
      <PageSection>
        <div className='grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10'>
          <aside className='min-w-0 lg:sticky lg:top-24 lg:self-start'>
            <AccountNavigation />
          </aside>
          <div className='flex min-w-0 flex-col gap-6'>{children}</div>
        </div>
      </PageSection>
    </PageContainer>
  );
}
