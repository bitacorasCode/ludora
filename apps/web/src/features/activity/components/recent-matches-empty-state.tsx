import { GameController03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/feedback';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export function RecentMatchesEmptyState() {
  const t = useTranslations('Activity.matches');

  return (
    <EmptyState
      variant='inline'
      icon={<HugeiconsIcon icon={GameController03Icon} size={24} />}
      title={t('emptyTitle')}
      description={t('emptyDescription')}
      action={
        <Button asChild variant='outline'>
          <Link href='/games'>{t('exploreGames')}</Link>
        </Button>
      }
    />
  );
}
