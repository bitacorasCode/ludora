import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { PageContainer, PageSection } from '@/components/layout';
import { PageHeading } from '@/components/typography';
import { Button } from '@/components/ui';
import { APP_ROUTES } from '@/config/routes';
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
        <Button asChild size='lg' className='sm:self-start'>
          <Link href={APP_ROUTES.home} prefetch={false}>
            {common('actions.backHome')}
          </Link>
        </Button>
      </PageSection>
    </PageContainer>
  );
}
