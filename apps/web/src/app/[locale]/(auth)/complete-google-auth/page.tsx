import { AUTH_ERROR_CODES } from '@ludora/contracts/auth';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { PageContainer, PageSection } from '@/components/layout';
import { GoogleCallbackCompletion } from '@/features/social-auth/components/google-callback-completion';
import { SOCIAL_AUTH_QUERY_PARAMS } from '@/features/social-auth/config';
import { getSocialAuthErrorLocation } from '@/features/social-auth/locations';
import { getPathname, redirect } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/resolve-locale';
import type { Locale } from '@/i18n/routing';

type GoogleCallbackPageProps = PageProps<'/[locale]/complete-google-auth'>;

export const metadata: Metadata = {
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
};

async function GoogleCallbackContent({
    locale,
    searchParams,
}: Pick<GoogleCallbackPageProps, 'searchParams'> & { locale: Locale }) {
    const { [SOCIAL_AUTH_QUERY_PARAMS.callbackId]: callbackId } = await searchParams;

    if (typeof callbackId !== 'string') {
        return redirect({
            locale,
            href: getSocialAuthErrorLocation({ errorCode: AUTH_ERROR_CODES.oauthFlowInvalid }),
        });
    }

    const errorLocation = getPathname({
        locale,
        href: getSocialAuthErrorLocation({ errorCode: AUTH_ERROR_CODES.oauthUnavailable }),
    });

    return (
        <GoogleCallbackCompletion
            key={callbackId}
            locale={locale}
            callbackId={callbackId}
            errorLocation={errorLocation}
        />
    );
}

export default async function CompleteGoogleAuthPage({ params, searchParams }: GoogleCallbackPageProps) {
    const { locale: requestedLocale } = await params;
    const locale = resolveLocale(requestedLocale);
    const t = await getTranslations({ locale, namespace: 'SocialAuth.google' });

    return (
        <PageContainer>
            <PageSection>
                <p role='status'>{t('completing')}</p>
                <Suspense fallback={null}>
                    <GoogleCallbackContent locale={locale} searchParams={searchParams} />
                </Suspense>
            </PageSection>
        </PageContainer>
    );
}
