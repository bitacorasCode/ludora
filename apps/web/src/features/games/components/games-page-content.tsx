import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/feedback';
import { PageContainer, PageSection } from '@/components/layout';
import { PageHeading } from '@/components/typography';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export function GamesPageContent() {
  const t = useTranslations('Catalog');
  const common = useTranslations('Common');

  return (
    <PageContainer>
      <PageSection aria-label={t('title')}>
        <PageHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
        />
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          action={
            <Button asChild variant='outline'>
              <Link href='/'>{common('actions.backHome')}</Link>
            </Button>
          }
        />
      </PageSection>
    </PageContainer>
  );
}
