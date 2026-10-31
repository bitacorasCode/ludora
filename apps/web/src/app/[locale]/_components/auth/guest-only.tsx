import 'server-only';

import { useTranslations } from 'next-intl';
import { type ReactNode, Suspense } from 'react';

import { PageContainer, PageSection } from '@/components/layout';
import { Spinner } from '@/components/ui';
import { APP_ROUTES } from '@/config/routes';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth';

type GuestOnlyProps = {
  children: ReactNode;
  locale: string;
  redirectTo?: string;
};

async function GuestOnlyContent({
  children,
  locale,
  redirectTo = APP_ROUTES.home,
}: GuestOnlyProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect({ href: redirectTo, locale });
  }

  return children;
}

export function GuestOnly(props: GuestOnlyProps) {
  const t = useTranslations('Common.status');

  return (
    <Suspense
      fallback={
        <PageContainer>
          <PageSection>
            <Spinner
              className='size-6 self-center'
              aria-label={t('checkingSession')}
            />
          </PageSection>
        </PageContainer>
      }
    >
      <GuestOnlyContent {...props} />
    </Suspense>
  );
}
