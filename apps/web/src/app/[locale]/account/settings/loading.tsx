import { useTranslations } from 'next-intl';

import { ContentSkeleton } from '@/components/feedback';

const PLACEHOLDER_ITEMS = 2;

export default function UserSettingsLoading() {
  const t = useTranslations('UserSettings');

  return (
    <ContentSkeleton
      variant='list'
      items={PLACEHOLDER_ITEMS}
      withCard
      withHeading
      label={t('loading')}
    />
  );
}
