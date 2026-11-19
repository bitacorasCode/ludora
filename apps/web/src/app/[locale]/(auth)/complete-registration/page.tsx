import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SocialRegistrationPageContent } from '@/features/social-auth';
import { getSocialAuthErrorLocation } from '@/features/social-auth/locations';
import { getOAuthRegistrationContext } from '@/features/social-auth/server';
import { redirect } from '@/i18n/navigation';
import { OPERATION_STATUS } from '@/lib/actions';

import { GuestOnly } from '../../_components/auth/guest-only';

export async function generateMetadata({
    params,
}: PageProps<'/[locale]/complete-registration'>): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'SocialAuth.registration' });

    return {
        title: t('title'),
        description: t('description'),
        robots: { index: false, follow: false },
        referrer: 'no-referrer',
    };
}

async function RegistrationContent({ locale }: { locale: string }) {
    const result = await getOAuthRegistrationContext();

    if (result.status === OPERATION_STATUS.error) {
        return redirect({ href: getSocialAuthErrorLocation(result.error), locale });
    }

    const { email, emailVerified } = result.data;

    return <SocialRegistrationPageContent email={email} emailVerified={emailVerified} />;
}

export default async function CompleteRegistrationPage({
    params,
}: PageProps<'/[locale]/complete-registration'>) {
    const { locale } = await params;

    return (
        <GuestOnly locale={locale}>
            <RegistrationContent locale={locale} />
        </GuestOnly>
    );
}
