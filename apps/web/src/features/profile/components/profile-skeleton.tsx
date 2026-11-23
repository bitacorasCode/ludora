import { useTranslations } from 'next-intl';

import { ContentSkeleton } from '@/components/feedback';

export function ProfileSkeleton() {
  const t = useTranslations('Profile');

  return (
    <ContentSkeleton
      variant='row'
      withAvatar
      withAction
      size='lg'
      withCard
      label={t('loading')}
    />
  );
}
