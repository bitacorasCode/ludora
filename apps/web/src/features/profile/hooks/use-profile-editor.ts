'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useUnsavedChanges } from '@/components/navigation';
import { useActionErrorToast, useRequestScope } from '@/hooks';
import { type ActionResult, OPERATION_STATUS } from '@/lib/actions';
import { FORM_VALIDATION_OPTIONS } from '@/lib/forms';

import type { Profile } from '../config';
import {
    type ProfilePreferences,
    profilePreferencesSchema,
    type ProfileResponse,
} from '../schema';

export type UseProfileEditorOptions = {
    profile: Profile;
    onSave: (
        values: ProfilePreferences,
    ) => Promise<ActionResult<ProfileResponse> | null>;
};

const PROFILE_SAVED_TOAST_ID = 'profile-saved';

export function useProfileEditor({ profile, onSave }: UseProfileEditorOptions) {
    const t = useTranslations('Profile');
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const { capture, invalidate } = useRequestScope();
    const unexpectedErrorToastId = useRef<ReturnType<typeof toast.error> | null>(
        null,
    );

    const { showError, dismissError } = useActionErrorToast({
        title: t('saveError'),
    });

    const form = useForm<ProfilePreferences>({
        resolver: zodResolver(profilePreferencesSchema),
        ...FORM_VALIDATION_OPTIONS,
        defaultValues: {
            avatarPresetId: profile.avatarPresetId,
            bio: profile.bio ?? '',
        },
    });

    useUnsavedChanges(
        isEditing && form.formState.isDirty,
    );

    const dismissFeedback = useCallback(() => {
        dismissError();

        if (unexpectedErrorToastId.current === null) return;

        toast.dismiss(unexpectedErrorToastId.current);
        unexpectedErrorToastId.current = null;
    }, [dismissError]);

    useLayoutEffect(
        () => () => {
            // Next.js preserves hidden pages, so transient editors must close.
            setIsEditing(false);
            dismissFeedback();
        },
        [dismissFeedback],
    );

    function handleOpenChange(open: boolean) {
        dismissFeedback();
        invalidate();
        form.reset({
            avatarPresetId: profile.avatarPresetId,
            bio: profile.bio ?? '',
        });
        setIsEditing(open);
    }

    function handleClose() {
        handleOpenChange(false);
    }

    async function onSubmit(values: ProfilePreferences) {
        if (!isEditing) return;

        const isCurrent = capture();
        dismissFeedback();

        try {
            const result = await onSave({
                avatarPresetId: values.avatarPresetId,
                bio: values.bio?.trim() || null,
            });

            if (!result || !isCurrent()) return;

            if (result.status === OPERATION_STATUS.error) {
                showError(result.error);
                return;
            }

            handleClose();
            toast.success(t('saved'), { id: PROFILE_SAVED_TOAST_ID });
            router.refresh();
        } catch {
            if (!isCurrent()) return;

            unexpectedErrorToastId.current = toast.error(t('saveError'), {
                duration: Infinity,
            });
        }
    }

    return { form, isEditing, onSubmit, handleOpenChange };
}
