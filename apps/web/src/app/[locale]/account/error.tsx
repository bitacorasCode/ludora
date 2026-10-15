'use client';

import { useTranslations } from 'next-intl';

import { ErrorState } from '@/components/feedback';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export default function AccountError({ retry }: { retry: () => void }) {
  const t = useTranslations('RouteError');

  return (
    <ErrorState
      title={t('title')}
      description={t('description')}
      primaryAction={
        <Button type='button' onClick={retry}>
          {t('retry')}
        </Button>
      }
      secondaryAction={
        <Button asChild variant='outline'>
          <Link href='/'>{t('backHome')}</Link>
        </Button>
      }
    />
  );
}
