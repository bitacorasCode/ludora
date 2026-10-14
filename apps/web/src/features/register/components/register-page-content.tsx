import { useTranslations } from 'next-intl';

import { FormPageCard } from '@/components/forms';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';

import { RegisterForm } from './register-form';

const formId = 'register-form';

export function RegisterPageContent() {
  const t = useTranslations('Register');

  return (
    <FormPageCard
      formId={formId}
      skipToForm={t('skipToForm')}
      title={t('title')}
      footer={
        <Button asChild variant='link'>
          <Link href='/login'>{t('signIn')}</Link>
        </Button>
      }
    >
      <RegisterForm id={formId} />
    </FormPageCard>
  );
}
