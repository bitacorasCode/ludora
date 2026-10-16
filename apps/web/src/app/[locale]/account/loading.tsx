import { useTranslations } from 'next-intl';

import { ContentSkeleton } from '@/components/feedback';

export default function AccountLoading() {
  const t = useTranslations('Account');

  return (
    <ContentSkeleton
      variant='list'
      items={2}
      withCard
      withHeading
      label={t('loading')}
    />
  );
}
