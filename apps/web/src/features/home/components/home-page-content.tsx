import { useTranslations } from 'next-intl';

import { PageContainer } from '@/components/layout';
import { PageHeading } from '@/components/typography';
import { Button, Card, CardFooter, CardHeader } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export function HomePageContent() {
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
            <Link href='/games'>{t('exploreLudora')}</Link>
          </Button>
        </CardFooter>
      </Card>
    </PageContainer>
  );
}
