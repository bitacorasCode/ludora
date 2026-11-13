'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { installBrowserHistoryGuard } from './browser-history-guard';

type NavigationAction = () => void;

const BEFORE_UNLOAD_EVENT = 'beforeunload';

export function useNavigationGuardController() {
  const blockers = useRef(new Set<symbol>());
  const pendingAction = useRef<NavigationAction | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const isBlocked = useCallback(() => blockers.current.size > 0, []);

  const handleBeforeUnload = useCallback(
    (event: BeforeUnloadEvent) => {
      if (!isBlocked()) return;

      event.preventDefault();

      // Support browsers that still require returnValue.
      event.returnValue = true;
    },
    [isBlocked],
  );

  const registerBlocker = useCallback(() => {
    const token = Symbol();

    blockers.current.add(token);

    if (blockers.current.size === 1) {
      window.addEventListener(BEFORE_UNLOAD_EVENT, handleBeforeUnload);
    }

    return () => {
      blockers.current.delete(token);

      if (blockers.current.size === 0) {
        window.removeEventListener(BEFORE_UNLOAD_EVENT, handleBeforeUnload);

        pendingAction.current = null;
        setIsOpen(false);
      }
    };
  }, [handleBeforeUnload]);

  const requestNavigation = useCallback(
    (action: NavigationAction) => {
      if (!isBlocked()) {
        action();
        return;
      }

      if (pendingAction.current !== null) return;

      pendingAction.current = action;
      setIsOpen(true);
    },
    [isBlocked],
  );

  useEffect(
    () =>
      installBrowserHistoryGuard({
        isBlocked,
        requestNavigation,
      }),
    [isBlocked, requestNavigation],
  );

  function closeDialog() {
    pendingAction.current = null;
    setIsOpen(false);
  }

  function confirmNavigation() {
    const action = pendingAction.current;

    closeDialog();
    action?.();
  }

  const value = useMemo(
    () => ({
      isBlocked,
      registerBlocker,
      requestNavigation,
    }),
    [isBlocked, registerBlocker, requestNavigation],
  );

  function handleOpenChange(open: boolean) {
    if (!open) closeDialog();
  }

  return { value, isOpen, handleOpenChange, confirmNavigation };
}
