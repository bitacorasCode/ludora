'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { SESSION_REVISION_COOKIE_NAME } from '@/lib/session/constants';
import { createLocalStorageStore } from '@/lib/storage';

const sessionRevisionStore = createLocalStorageStore('ludora:session-revision');
const sessionRevisionCookiePrefix = `${SESSION_REVISION_COOKIE_NAME}=`;

function readBrowserRevision(): string | null {
  const cookie = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(sessionRevisionCookiePrefix));

  return cookie?.slice(sessionRevisionCookiePrefix.length) ?? null;
}

export function SessionSync({ revision }: { revision: string | null }) {
  const { refresh } = useRouter();

  useEffect(() => {
    const browserRevision = readBrowserRevision();

    try {
      if (sessionRevisionStore.getSnapshot() !== browserRevision) {
        if (browserRevision === null) {
          sessionRevisionStore.remove();
        } else {
          sessionRevisionStore.set(browserRevision);
        }
      }
    } catch {
      // Returning to a tab also checks for changes when storage is unavailable.
    }

    function refreshIfChanged() {
      if (readBrowserRevision() !== revision) refresh();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') refreshIfChanged();
    }

    const unsubscribe = sessionRevisionStore.subscribe(refreshIfChanged);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    refreshIfChanged();

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refresh, revision]);

  return null;
}
