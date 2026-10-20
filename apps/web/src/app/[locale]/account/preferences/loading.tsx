import { useTranslations } from 'next-intl';

import { ContentSkeleton } from '@/components/feedback';

const PLACEHOLDER_ITEMS = 2;

export default function PreferencesLoading() {
  const t = useTranslations('Preferences');

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
