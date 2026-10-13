import { useTranslations } from 'next-intl';

import { PageContainer, PageSection } from '@/components/layout/page-layout';
import { PageHeading, SectionHeading } from '@/components/typography/heading';
import { BodyText, SubsectionTitle } from '@/components/typography/typography';
import { Button, Card, CardFooter, CardHeader } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export default function Home() {
  const t = useTranslations('Home');

  return (
    <PageContainer>
      <Card variant='hero'>
        <CardHeader>
          <PageHeading
            eyebrow={t('eyebrow')}
            title={t('title')}
            description={t('description')}
          />
        </CardHeader>

        <CardFooter>
          <Button asChild size='lg'>
            <Link href='#catalog'> {t('exploreLudora')} </Link>
          </Button>
        </CardFooter>
      </Card>

      <PageSection id='catalog' aria-labelledby='catalog-title'>
        <SectionHeading
          eyebrow={t('catalogTitle')}
          title={t('catalogTitle')}
          titleId='catalog-title'
        />

        <Card variant='empty'>
          <CardHeader>
            <SubsectionTitle>{t('catalogEmptyTitle')}</SubsectionTitle>
            <BodyText>{t('catalogEmptyDescription')}</BodyText>
          </CardHeader>
        </Card>
      </PageSection>

      <PageSection id='ranking' aria-labelledby='ranking-title' separated>
        <SectionHeading
          eyebrow={t('community')}
          title='Ranking'
          titleId='ranking-title'
        />
        <Card variant='hero'>
          <CardHeader>
            <BodyText>{t('rankingDescription')}</BodyText>
          </CardHeader>
        </Card>
      </PageSection>
    </PageContainer>
  );
}
