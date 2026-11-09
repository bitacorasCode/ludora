'use client';

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
} from 'react';

import { useProtectedRequest } from '@/hooks';
import {
    type ActionError,
    type ActionResult,
    OPERATION_STATUS,
} from '@/lib/actions';
import { API_ERROR_CODES } from '@/lib/api/constants';

import { saveProfile } from '../actions';
import { loadProfile } from '../client/load-profile';
import type { Profile } from '../config';
import type { ProfilePreferences, ProfileResponse } from '../schema';
import { createProfileStorage, readPreferences } from '../storage';

type RemoteSnapshot = {
    preferences: ProfilePreferences;
    storageValue: string | null;
};

export function useProfile(userId: string, nickname: string) {
    const storage = useMemo(
        () => createProfileStorage(userId),
        [userId],
    );

    const { execute, isRecoveringSession } = useProtectedRequest();

    const storedValue = useSyncExternalStore<
        string | null | undefined
    >(
        storage.subscribe,
        storage.getSnapshot,
        storage.getServerSnapshot,
    );

    const [remoteSnapshot, setRemoteSnapshot] =
        useState<RemoteSnapshot | null>(null);
    const [error, setError] = useState<ActionError | null>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(true);

    const updateProfile = useCallback(
        (data: ProfileResponse): boolean => {
            if (data.userId !== userId) {
                return false;
            }

            const { avatarPresetId, bio } = data;
            const preferences = { avatarPresetId, bio };

            try {
                storage.save(preferences);
            } catch {
                // Server data remains usable if local storage is unavailable.
            }

            setRemoteSnapshot({
                preferences,
                storageValue: storage.getSnapshot(),
            });
            setError(null);

            return true;
        },
        [storage, userId],
    );

    useEffect(() => {
        const controller = new AbortController();

        async function refreshProfile() {
            const result = await execute(
                () => loadProfile(controller.signal),
                {
                    signal: controller.signal,
                    retryAfterRecovery: true,
                },
            );

            if (controller.signal.aborted) return;

            setIsRefreshing(false);

            if (!result) return;

            if (result.status === OPERATION_STATUS.error) {
                setError(result.error);
                return;
            }

            if (!updateProfile(result.data)) {
                setError({
                    errorCode: API_ERROR_CODES.invalidResponse,
                });
            }
        }

        void refreshProfile();

        return () => controller.abort();
    }, [execute, updateProfile, refreshVersion]);

    const cachedPreferences = readPreferences(storedValue ?? null);

    const storageChanged =
        remoteSnapshot !== null
        && storedValue !== remoteSnapshot.storageValue;

    const preferences =
        cachedPreferences && (remoteSnapshot === null || storageChanged)
            ? cachedPreferences
            : remoteSnapshot?.preferences ?? cachedPreferences;

    const profile: Profile | null = preferences
        ? { nickname, ...preferences }
        : null;

    function reload() {
        setError(null);
        setIsRefreshing(true);
        setRefreshVersion((version) => version + 1);
    }

    async function save(
        values: ProfilePreferences,
    ): Promise<ActionResult<ProfileResponse> | null> {
        const result = await execute(
            () => saveProfile(userId, values),
        );

        if (!result || result.status === OPERATION_STATUS.error) {
            return result;
        }

        if (!updateProfile(result.data)) {
            return {
                status: OPERATION_STATUS.error,
                error: {
                    errorCode: API_ERROR_CODES.invalidResponse,
                },
            };
        }

        return result;
    }

    const canEdit =
        remoteSnapshot !== null
        && !isRefreshing
        && !isRecoveringSession
        && error === null;

    return {
        profile,
        error,
        reload,
        canEdit,
        save,
    };
};