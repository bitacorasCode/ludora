import { useTranslations } from 'next-intl';

import { ContentSkeleton } from '@/components/feedback';
import { Card, CardContent } from '@/components/ui';

export function AuthFormSkeleton({ fields }: { fields: number }) {
  const t = useTranslations('Common.status');

  return (
    <div className='mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-16'>
      <Card className='w-full'>
        <CardContent>
          <ContentSkeleton
            variant='list'
            items={fields}
            descriptionLines={1}
            withHeading
            label={t('loadingForm')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
