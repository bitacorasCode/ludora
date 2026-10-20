import { useTranslations } from 'next-intl';

import { AccountContentSkeleton } from '@/features/account';

export default function AccountLoading() {
  const t = useTranslations('Account');

  return <AccountContentSkeleton label={t('loading')} />;
}
