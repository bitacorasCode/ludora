import { useTranslations } from 'next-intl';

import { PageHeading } from '@/components/typography';

export function ProfilePageHeading() {
  const t = useTranslations('Profile');

  return <PageHeading eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />;
}
