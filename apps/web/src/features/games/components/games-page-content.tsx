import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/feedback';
import { PageContainer, PageSection } from '@/components/layout';
import { PageHeading } from '@/components/typography';
import { Button } from '@/components/ui';
import { APP_ROUTES } from '@/config/routes';
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
          title={t('empty.title')}
          description={t('empty.description')}
          action={
            <Button asChild variant='outline'>
              <Link href={APP_ROUTES.home}>{common('actions.backHome')}</Link>
            </Button>
          }
        />
      </PageSection>
    </PageContainer>
  );
}
