import { Link } from '@/i18n/navigation';
import { PageContainer, PageSection } from '@/components/layout/page-layout';
import { Card, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BodyText, SubsectionTitle } from '@/components/typography/typography';
import { PageHeading, SectionHeading } from '@/components/typography/heading';
import { useTranslations } from 'next-intl';

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
