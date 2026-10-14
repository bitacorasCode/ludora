import { useTranslations } from 'next-intl';

import { FormPageCard } from '@/components/forms';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';

import { RecoveryRequestForm } from './recovery-request-form';

const formId = 'recovery-request-form';

export function RecoveryRequestPageContent() {
  const t = useTranslations('PasswordRecovery');

  return (
    <FormPageCard
      formId={formId}
      skipToForm={t('skipToForm')}
      title={t('request.title')}
      description={t('request.description')}
      footer={
        <Button asChild variant='link'>
          <Link href='/login'>{t('backToLogin')}</Link>
        </Button>
      }
    >
      <RecoveryRequestForm
        id={formId}
        feedbackAction={
          <Button asChild variant='link' className='px-0'>
            <Link href='/reset-password'>{t('request.previewReset')}</Link>
          </Button>
        }
      />
    </FormPageCard>
  );
}
