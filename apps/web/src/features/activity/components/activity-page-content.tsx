import { useTranslations } from 'next-intl';

import { ItemList, type ItemListEntry } from '@/components/lists';
import { PageHeading } from '@/components/typography';
import { Card, CardContent } from '@/components/ui';

import { RankingsEmptyState } from './rankings-empty-state';
import { RecentMatchesEmptyState } from './recent-matches-empty-state';

export function ActivityPageContent() {
  const t = useTranslations('Activity');
  const items = [
    {
      id: 'matches',
      title: t('matches.title'),
      description: t('matches.description'),
      content: <RecentMatchesEmptyState />,
    },
    {
      id: 'rankings',
      title: t('rankings.title'),
      description: t('rankings.description'),
      content: <RankingsEmptyState />,
    },
  ] satisfies readonly ItemListEntry[];

  return (
    <>
      <PageHeading
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
      />
      <Card>
        <CardContent>
          <ItemList items={items} ariaLabel={t('title')} />
        </CardContent>
      </Card>
    </>
  );
}
