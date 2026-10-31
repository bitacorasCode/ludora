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
import { APP_ROUTES } from '@/config/routes';
import { Link } from '@/i18n/navigation';
import { EMAIL_VERIFICATION_CODE_LENGTH } from '@/lib/schemas';

import useEmailVerificationForm from '../hooks/use-email-verification-form';
import { EmailVerificationResendButton } from './email-verification-resend-button';

type EmailVerificationPageContentProps = {
    verificationId: string;
    initialWaitSeconds?: number;
    deliveryUnconfirmed?: boolean;
};

const formId = 'email-verification-form';

export function EmailVerificationPageContent({
    verificationId,
    initialWaitSeconds = 0,
    deliveryUnconfirmed = false,
}: EmailVerificationPageContentProps) {
    const t = useTranslations('EmailVerification');
    const {
        form,
        onSubmit,
        onResend,
        isSubmitting,
        isResending,
        isBusy,
        secondsRemaining,
        deliveryUnconfirmed: showDeliveryWarning,
    } = useEmailVerificationForm({
        verificationId,
        initialWaitSeconds,
        deliveryUnconfirmed,
    });

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
                aria-busy={isBusy}
                tabIndex={-1}
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
            >
                {showDeliveryWarning && (
                    <Alert
                        status='warning'
                        role='status'
                        title={t('feedback.deliveryUnconfirmedTitle')}
                        message={t('feedback.deliveryUnconfirmedMessage')}
                    />
                )}

                <FieldSet disabled={isBusy}>
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

                        <EmailVerificationResendButton
                            secondsRemaining={secondsRemaining}
                            isResending={isResending}
                            disabled={isBusy}
                            onResend={onResend}
                        />

                        <FormActions
                            secondaryAction={
                                <Button asChild variant='link'>
                                    <Link href={APP_ROUTES.login}>{t('backToLogin')}</Link>
                                </Button>
                            }
                        >
                            <SubmitButton
                                isSubmitting={isSubmitting}
                                disabled={isResending}
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
