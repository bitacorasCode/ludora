'use client';

import { useTranslations } from 'next-intl';

import { FeedbackAlert } from '@/components/feedback';
import {
    FormActions,
    FormPageCard,
    FormTextField,
    SubmitButton,
} from '@/components/forms';
import { Button, FieldGroup, FieldSet } from '@/components/ui';
import { useActionErrorMessage } from '@/hooks';
import { Link } from '@/i18n/navigation';
import { OPERATION_STATUS } from '@/lib/actions';
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
    const verificationErrors = useTranslations('EmailVerification.errors');
    const {
        form,
        onSubmit,
        clearSubmission,
        submissionError,
        isSubmitting,
    } = useEmailVerificationForm(verificationId);

    const errorMessage = useActionErrorMessage(
        submissionError,
        verificationErrors,
    );

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
                onChange={clearSubmission}
                noValidate
            >
                {deliveryUnconfirmed && (
                    <FeedbackAlert
                        status='warning'
                        title={t('feedback.deliveryUnconfirmedTitle')}
                        message={t('feedback.deliveryUnconfirmedMessage')}
                    />
                )}

                {errorMessage && (
                    <FeedbackAlert
                        status={OPERATION_STATUS.error}
                        title={t('feedback.errorTitle')}
                        message={errorMessage}
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
