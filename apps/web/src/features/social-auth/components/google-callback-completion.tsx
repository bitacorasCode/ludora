'use client';

import { useEffect, useRef } from 'react';

import { withSessionLock } from '@/lib/session/session-lock';

import { completeGoogleAuth } from '../actions';

type GoogleCallbackCompletionProps = {
    locale: string;
    callbackId: string;
    errorLocation: string;
};

export function GoogleCallbackCompletion({ locale, callbackId, errorLocation }: GoogleCallbackCompletionProps) {
    const completion = useRef<Promise<string> | null>(null);

    useEffect(() => {
        let active = true;

        function navigate(location: string) {
            if (active) window.location.replace(location);
        }

        completion.current ??= withSessionLock(() => completeGoogleAuth(locale, callbackId));
        void completion.current.then(navigate, () => navigate(errorLocation));

        return () => {
            active = false;
        };
    }, [locale, callbackId, errorLocation]);

    return null;
}
