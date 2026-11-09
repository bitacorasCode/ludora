import { TrophyIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/feedback';
import { Button } from '@/components/ui';
import { APP_ROUTES } from '@/config/routes';
import { Link } from '@/i18n/navigation';

export function RankingsEmptyState() {
  const t = useTranslations('Activity.rankings');

  return (
    <EmptyState
      variant='inline'
      icon={<HugeiconsIcon icon={TrophyIcon} size={24} />}
      title={t('empty.title')}
      description={t('empty.description')}
      action={
        <Button asChild variant='outline'>
          <Link href={APP_ROUTES.ranking}>{t('viewRankings')}</Link>
        </Button>
      }
    />
  );
}
