import { useTranslations } from 'next-intl';

import { PageContainer, PageSection } from '@/components/layout';
import { PageHeading } from '@/components/typography';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('NotFound');

  return (
    <PageContainer>
      <PageSection aria-label={t('title')}>
        <PageHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
        />
        <div className='flex flex-col gap-3 sm:flex-row'>
          <Button asChild size='lg'>
            <Link href='/'>{t('backHome')}</Link>
          </Button>
          <Button asChild variant='outline' size='lg'>
            <Link href='/games'>{t('exploreGames')}</Link>
          </Button>
        </div>
      </PageSection>
    </PageContainer>
  );
}
