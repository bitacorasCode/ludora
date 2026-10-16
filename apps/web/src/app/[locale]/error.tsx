'use client';

import { useTranslations } from 'next-intl';

import { ErrorState } from '@/components/feedback';
import { PageContainer, PageSection } from '@/components/layout';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export default function RouteError({ retry }: { retry: () => void }) {
  const t = useTranslations('RouteError');
  const common = useTranslations('Common');

  return (
    <PageContainer>
      <PageSection aria-label={t('title')}>
        <ErrorState
          title={t('title')}
          description={t('description')}
          primaryAction={
            <Button type='button' onClick={retry}>
              {common('actions.retry')}
            </Button>
          }
          secondaryAction={
            <Button asChild variant='outline'>
              <Link href='/'>{common('actions.backHome')}</Link>
            </Button>
          }
        />
      </PageSection>
    </PageContainer>
  );
}
