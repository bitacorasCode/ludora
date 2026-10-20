import { useTranslations } from 'next-intl';

import { ContentSkeleton } from '@/components/feedback';

type ProfileSkeletonProps = {
  withHeading?: boolean;
};

export function ProfileSkeleton({ withHeading = false }: ProfileSkeletonProps) {
  const t = useTranslations('Profile');

  return (
    <ContentSkeleton
      variant='row'
      withAvatar
      withAction
      size='lg'
      withCard
      withHeading={withHeading}
      label={t('loading')}
    />
  );
}
