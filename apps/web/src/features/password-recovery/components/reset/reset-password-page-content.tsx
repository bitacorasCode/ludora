import { useTranslations } from 'next-intl';

import { FormPageCard } from '@/components/forms';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';

import { ResetPasswordForm } from './reset-password-form';

const formId = 'reset-password-form';

export function ResetPasswordPageContent() {
  const t = useTranslations('PasswordRecovery');

  return (
    <FormPageCard
      formId={formId}
      skipToForm={t('skipToForm')}
      title={t('reset.title')}
      description={t('reset.description')}
      footer={
        <Button asChild variant='link'>
          <Link href='/login'>{t('backToLogin')}</Link>
        </Button>
      }
    >
      <ResetPasswordForm id={formId} />
    </FormPageCard>
  );
}
