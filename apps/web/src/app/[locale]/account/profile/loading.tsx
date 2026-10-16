import { useTranslations } from 'next-intl';

import { ContentSkeleton } from '@/components/feedback';

export default function ProfileLoading() {
  const t = useTranslations('Profile');

  return (
    <ContentSkeleton
      variant='row'
      withAvatar
      withAction
      size='lg'
      withCard
      withHeading
      label={t('loading')}
    />
  );
}
