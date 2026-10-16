import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { PageContainer, PageSection } from '@/components/layout';
import { PageHeading } from '@/components/typography';
import { Button } from '@/components/ui';
import { getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

type NotFoundPageContentProps = {
  locale: Locale;
};

export async function NotFoundPageContent({ locale }: NotFoundPageContentProps) {
  const [t, common] = await Promise.all([
    getTranslations({ locale, namespace: 'NotFound' }),
    getTranslations({ locale, namespace: 'Common' }),
  ]);

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
            <Link href={getPathname({ locale, href: '/' })}>
              {common('actions.backHome')}
            </Link>
          </Button>
          <Button asChild variant='outline' size='lg'>
            <Link href={getPathname({ locale, href: '/games' })}>
              {t('exploreGames')}
            </Link>
          </Button>
        </div>
      </PageSection>
    </PageContainer>
  );
}
