import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { PageContainer, PageSection } from '@/components/layout';
import { BodyText, PageHeading, SectionTitle } from '@/components/typography';
import { Button, Card, CardFooter, CardHeader } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/games'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Catalog' });

  return {
    title: `${t('title')} | Ludora`,
    description: t('description'),
  };
}

export default function CatalogPage() {
  const t = useTranslations('Catalog');

  return (
    <PageContainer>
      <PageSection aria-label={t('title')}>
        <PageHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
        />

        <Card variant='empty'>
          <CardHeader>
            <SectionTitle>{t('emptyTitle')}</SectionTitle>
            <BodyText>{t('emptyDescription')}</BodyText>
          </CardHeader>
          <CardFooter>
            <Button asChild variant='outline'>
              <Link href='/'>{t('backHome')}</Link>
            </Button>
          </CardFooter>
        </Card>
      </PageSection>
    </PageContainer>
  );
}
