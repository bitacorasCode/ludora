'use client';

import { useTranslations } from 'next-intl';

import { FormActions, FormPageCard, FormTextField, SubmitButton } from '@/components/forms';
import { BodyText } from '@/components/typography';
import { Button, FieldGroup, FieldSet } from '@/components/ui';
import { APP_ROUTES } from '@/config/routes';
import { Link } from '@/i18n/navigation';

import { useSocialRegistrationForm } from '../hooks/use-social-registration-form';

const formId = 'social-registration-form';

type SocialRegistrationPageContentProps = {
    email: string | null;
    emailVerified: boolean;
};

export function SocialRegistrationPageContent({
    email,
    emailVerified,
}: SocialRegistrationPageContentProps) {
    const t = useTranslations('SocialAuth.registration');
    const register = useTranslations('Register');
    const { form, onSubmit, isSubmitting } = useSocialRegistrationForm(email === null);
    const restartAction = (
        <Button asChild variant='link'>
            <Link href={APP_ROUTES.login}>{t('restart')}</Link>
        </Button>
    );

    return (
        <FormPageCard
            formId={formId}
            skipToForm={register('skipToForm')}
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
                <FieldSet disabled={isSubmitting}>
                    <legend className='sr-only'>{register('accountData')}</legend>
                    {email !== null && (
                        <div className='space-y-1'>
                            <BodyText className='break-words'>{t('email.account', { email })}</BodyText>
                            <BodyText className='text-sm'>
                                {t(emailVerified ? 'email.verified' : 'email.verificationRequired')}
                            </BodyText>
                        </div>
                    )}
                    <FieldGroup>
                        <FormTextField
                            control={form.control}
                            name='nickname'
                            label={register('fields.nickname.label')}
                            placeholder={register('fields.nickname.placeholder')}
                            autoComplete='username'
                        />
                        {email === null && (
                            <FormTextField
                                control={form.control}
                                name='email'
                                label={register('fields.email.label')}
                                placeholder={register('fields.email.placeholder')}
                                inputType='email'
                                autoComplete='email'
                            />
                        )}
                    </FieldGroup>
                    {email === null && <BodyText className='text-sm'>{t('email.verificationRequired')}</BodyText>}
                    <FormActions secondaryAction={restartAction}>
                        <SubmitButton
                            isSubmitting={isSubmitting}
                            mainText={register('submit')}
                            submittingText={register('submitting')}
                        />
                    </FormActions>
                </FieldSet>
            </form>
        </FormPageCard>
    );
}
