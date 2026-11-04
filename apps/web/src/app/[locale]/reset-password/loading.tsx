import { useTranslations } from 'next-intl';

import { ContentSkeleton } from '@/components/feedback';
import { PageContainer, PageSection } from '@/components/layout';

const PASSWORD_RESET_PLACEHOLDER_FIELDS = 2;

export default function ResetPasswordLoading() {
  const t = useTranslations('PasswordRecovery.reset');

  return (
    <PageContainer className='max-w-xl'>
      <PageSection>
        <ContentSkeleton
          variant='list'
          items={PASSWORD_RESET_PLACEHOLDER_FIELDS}
          withHeading
          withCard
          label={t('loading')}
        />
      </PageSection>
    </PageContainer>
  );
}
