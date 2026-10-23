import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';

import { EmailVerificationPageContent } from '@/features/email-verification';
import { redirect } from '@/i18n/navigation';

import { GuestOnly } from '../_components/auth/guest-only';

export async function generateMetadata({
    params,
}: PageProps<'/[locale]/verify-email'>): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({
        locale,
        namespace: 'EmailVerification',
    });

    return {
        title: t('title'),
        description: t('description'),
        robots: { index: false, follow: false },
    };
}

async function VerificationContent({
    searchParams,
    locale,
}: Pick<PageProps<'/[locale]/verify-email'>, 'searchParams'> & {
    locale: string;
}) {
    const { verificationId, delivery } = await searchParams;
    const validation = z.uuid().safeParse(verificationId);

    if (!validation.success) {
        return redirect({ href: '/register', locale });
    }

    return (
        <EmailVerificationPageContent
            key={validation.data}
            verificationId={validation.data}
            deliveryUnconfirmed={delivery === 'unconfirmed'}
        />
    );
}

export default async function VerifyEmailPage({
    params,
    searchParams,
}: PageProps<'/[locale]/verify-email'>) {
    const { locale } = await params;

    return (
        <GuestOnly locale={locale} redirectTo='/account/profile'>
            <VerificationContent searchParams={searchParams} locale={locale} />
        </GuestOnly>
    );
}
