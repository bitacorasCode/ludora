import { TrophyIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/feedback';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export function RankingsEmptyState() {
  const t = useTranslations('Activity.rankings');

  return (
    <EmptyState
      variant='inline'
      icon={<HugeiconsIcon icon={TrophyIcon} size={24} />}
      title={t('emptyTitle')}
      description={t('emptyDescription')}
      action={
        <Button asChild variant='outline'>
          <Link href='/ranking'>{t('viewRankings')}</Link>
        </Button>
      }
    />
  );
}
