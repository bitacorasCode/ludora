'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Alert } from '@/components/feedback';
import {
  FormActions,
  FormPageCard,
  FormTextField,
  SubmitButton,
} from '@/components/forms';
import { Button, FieldGroup } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import {
  createRecoveryRequestSchema,
  type RecoveryRequestFormData,
} from '@/lib/schemas';

const formId = 'recovery-request-form';
const RECOVERY_REQUEST_VALIDATED_TOAST_ID = 'recovery-request-validated';

export function RecoveryRequestPageContent() {
  const t = useTranslations('PasswordRecovery');
  const common = useTranslations('Common');
  const validation = useTranslations('PasswordRecovery.validation');

  const form = useForm<RecoveryRequestFormData>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    resolver: zodResolver(
      createRecoveryRequestSchema((key) => validation(key)),
    ),
    defaultValues: { email: '' },
  });

  return (
    <FormPageCard
      formId={formId}
      skipToForm={t('skipToForm')}
      title={t('request.title')}
      description={t('request.description')}
    >
      <form
        id={formId}
        aria-label={t('request.title')}
        aria-busy={form.formState.isSubmitting}
        tabIndex={-1}
        onSubmit={form.handleSubmit(() => {
          toast.warning(t('request.validatedMessage'), {
            id: RECOVERY_REQUEST_VALIDATED_TOAST_ID,
          });
        })}
        noValidate
      >
        <Alert
          status='warning'
          role='status'
          title={t('request.feedbackTitle')}
          message={t('request.feedbackMessage')}
        />
        <FieldGroup>
          <FormTextField
            control={form.control}
            name='email'
            inputType='email'
            autoComplete='email'
            label={t('email')}
            placeholder={t('emailPlaceholder')}
          />
          <Button asChild variant='link' className='justify-start px-0'>
            <Link href='/reset-password'>{t('request.previewReset')}</Link>
          </Button>
          <FormActions
            secondaryAction={
              <Button asChild variant='link'>
                <Link href='/login'>{t('backToLogin')}</Link>
              </Button>
            }
          >
            <SubmitButton
              isSubmitting={form.formState.isSubmitting}
              mainText={common('actions.continue')}
              submittingText={common('status.validating')}
            />
          </FormActions>
        </FieldGroup>
      </form>
    </FormPageCard>
  );
}
