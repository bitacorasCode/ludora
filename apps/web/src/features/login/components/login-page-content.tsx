import { useTranslations } from 'next-intl';

import { FormPageCard } from '@/components/forms';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';

import { LoginForm } from './login-form';

const formId = 'login-form';

export function LoginPageContent() {
  const t = useTranslations('Login');

  return (
    <FormPageCard
      formId={formId}
      skipToForm={t('skipToForm')}
      title={t('title')}
      description={t('description')}
      footer={
        <Button asChild variant='link'>
          <Link href='/register'>{t('register')}</Link>
        </Button>
      }
    >
      <LoginForm
        id={formId}
        passwordHelp={
          <Button asChild variant='link' className='mt-2 px-0'>
            <Link href='/forgot-password'>{t('forgotPassword')}</Link>
          </Button>
        }
      />
    </FormPageCard>
  );
}
