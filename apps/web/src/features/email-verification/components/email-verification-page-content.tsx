'use client';

import { useTranslations } from 'next-intl';

import { Alert } from '@/components/feedback';
import {
    FormActions,
    FormPageCard,
    FormTextField,
    SubmitButton,
} from '@/components/forms';
import { Button, FieldGroup, FieldSet } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { EMAIL_VERIFICATION_CODE_LENGTH } from '@/lib/schemas';

import useEmailVerificationForm from '../hooks/use-email-verification-form';

type EmailVerificationPageContentProps = {
    verificationId: string;
    deliveryUnconfirmed?: boolean;
};

const formId = 'email-verification-form';

export function EmailVerificationPageContent({
    verificationId,
    deliveryUnconfirmed = false,
}: EmailVerificationPageContentProps) {
    const t = useTranslations('EmailVerification');
    const {
        form,
        onSubmit,
        isSubmitting,
    } = useEmailVerificationForm(verificationId);

    return (
        <FormPageCard
            formId={formId}
            skipToForm={t('skipToForm')}
            title={t('title')}
            description={t('description')}
        >
            <form
                id={formId}
                aria-label={t('title')}
                aria-busy={isSubmitting}
                tabIndex={-1}
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
            >
                {deliveryUnconfirmed && (
                    <Alert
                        status='warning'
                        role='status'
                        title={t('feedback.deliveryUnconfirmedTitle')}
                        message={t('feedback.deliveryUnconfirmedMessage')}
                    />
                )}

                <FieldSet disabled={isSubmitting}>
                    <FieldGroup>
                        <FormTextField
                            control={form.control}
                            name='code'
                            label={t('codeLabel')}
                            placeholder={t('codePlaceholder')}
                            inputMode='numeric'
                            maxLength={EMAIL_VERIFICATION_CODE_LENGTH}
                            autoComplete='one-time-code'
                            autoFocus
                        />

                        <FormActions
                            secondaryAction={
                                <Button asChild variant='link'>
                                    <Link href='/login'>{t('backToLogin')}</Link>
                                </Button>
                            }
                        >
                            <SubmitButton
                                isSubmitting={isSubmitting}
                                mainText={t('submit')}
                                submittingText={t('submitting')}
                            />
                        </FormActions>
                    </FieldGroup>
                </FieldSet>
            </form>
        </FormPageCard>
    );
}
