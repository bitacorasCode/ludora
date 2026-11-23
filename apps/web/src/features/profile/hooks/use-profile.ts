'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { useProtectedRequest } from '@/hooks';
import { type ActionResult, OPERATION_STATUS } from '@/lib/actions';

import { saveProfile } from '../actions';
import { loadProfile } from '../client/load-profile';
import type { Profile } from '../config';
import { type ProfilePreferences, type ProfileResponse, validateProfileOwner } from '../schema';
import { createProfileStorage, readPreferences } from '../storage';

type ProfileResult = ActionResult<ProfileResponse>;

type ProfileUpdate = {
    initialResult: ProfileResult;
    result: ProfileResult;
};

type PublishedPreferences = {
    initialResult: ProfileResult;
    preferences: ProfilePreferences;
};

export function useProfile(userId: string, nickname: string, initialResult: ProfileResult) {
    const storage = useMemo(() => createProfileStorage(userId), [userId]);
    const { execute, isRecoveringSession } = useProtectedRequest();
    const [update, setUpdate] = useState<ProfileUpdate | null>(null);
    const [published, setPublished] = useState<PublishedPreferences | null>(null);
    const [isReloading, startReload] = useTransition();
    const reloadRequest = useRef<AbortController | null>(null);

    useEffect(() => () => reloadRequest.current?.abort(), [initialResult]);

    useEffect(() => storage.subscribe(() => {
        const preferences = readPreferences(storage.getSnapshot());

        setPublished(preferences ? { initialResult, preferences } : null);
    }), [initialResult, storage]);

    const result = update?.initialResult === initialResult ? update.result : initialResult;
    const preferences = published?.initialResult === initialResult ? published.preferences : null;
    const profile: Profile | null = result.status === OPERATION_STATUS.success
        ? { nickname, avatarPresetId: result.data.avatarPresetId, bio: result.data.bio, ...preferences }
        : null;
    const error = result.status === OPERATION_STATUS.error && !isReloading ? result.error : null;

    function reload() {
        reloadRequest.current?.abort();
        const controller = new AbortController();
        reloadRequest.current = controller;

        startReload(async () => {
            const loaded = await execute(
                () => loadProfile(controller.signal),
                { signal: controller.signal },
            );

            if (loaded) {
                setPublished(null);
                setUpdate({ initialResult, result: validateProfileOwner(loaded, userId) });
            }
        });
    }

    async function save(values: ProfilePreferences): Promise<ProfileResult | null> {
        const saved = await execute(() => saveProfile(userId, values));

        if (!saved) return null;

        const result = validateProfileOwner(saved, userId);

        if (result.status === OPERATION_STATUS.success) {
            setPublished(null);
            setUpdate({ initialResult, result });

            try {
                storage.save(result.data);
            } catch {
                // The saved profile remains available when browser storage is unavailable.
            }
        }

        return result;
    }

    return {
        profile,
        error,
        reload,
        canEdit: profile !== null && !isReloading && !isRecoveringSession,
        save,
    };
}
