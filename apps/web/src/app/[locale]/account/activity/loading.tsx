import { useTranslations } from 'next-intl';

import { ContentSkeleton } from '@/components/feedback';

const PLACEHOLDER_ITEMS = 2;
const DESCRIPTION_LINES = 3;

export default function ActivityLoading() {
  const t = useTranslations('Activity');

  return (
    <ContentSkeleton
      variant='list'
      items={PLACEHOLDER_ITEMS}
      descriptionLines={DESCRIPTION_LINES}
      withCard
      withHeading
      label={t('loading')}
    />
  );
}
