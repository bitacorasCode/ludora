import { useTranslations } from 'next-intl';

import { ContentSkeleton } from '@/components/feedback';

export default function ActivityLoading() {
  const t = useTranslations('Activity');

  return (
    <ContentSkeleton
      variant='list'
      items={2}
      descriptionLines={3}
      withCard
      withHeading
      label={t('loading')}
    />
  );
}
