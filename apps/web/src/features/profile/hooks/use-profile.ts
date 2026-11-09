'use client';

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
} from 'react';

import { type ActionError, OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES } from '@/lib/api/constants';

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
            const result = await loadProfile(controller.signal);

            if (controller.signal.aborted) return;

            setIsRefreshing(false);

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
    }, [updateProfile, refreshVersion]);

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

    const canEdit =
        remoteSnapshot !== null
        && !isRefreshing
        && error === null;

    return {
        profile,
        error,
        reload,
        canEdit,
        updateProfile,
    };
}