import { useTranslations } from 'next-intl';

import { ContentSkeleton } from '@/components/feedback';

const PLACEHOLDER_ITEMS = 2;

export default function ActivityLoading() {
  const t = useTranslations('Activity');

  return (
    <ContentSkeleton
      variant='list'
      items={PLACEHOLDER_ITEMS}
      descriptionLines={3}
      withCard
      withHeading
      label={t('loading')}
    />
  );
}
