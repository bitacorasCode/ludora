'use client';

import { useTranslations } from 'next-intl';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ConfirmationDialog } from '@/components/overlays';

type NavigationAction = () => void;

type NavigationGuardContextValue = {
  isBlocked: () => boolean;
  registerBlocker: () => () => void;
  requestNavigation: (action: NavigationAction) => void;
};

const NavigationGuardContext =
  createContext<NavigationGuardContextValue | null>(null);

const BEFORE_UNLOAD_EVENT = 'beforeunload';

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const t = useTranslations('Common.unsavedChanges');

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

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}

      <ConfirmationDialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        title={t('title')}
        description={t('description')}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        onConfirm={confirmNavigation}
      />
    </NavigationGuardContext.Provider>
  );
}

export function useNavigationGuard() {
  const context = useContext(NavigationGuardContext);

  if (!context) {
    throw new Error(
      'NavigationGuardProvider is required to use the navigation guard.',
    );
  }

  return context;
}

export function useUnsavedChanges(hasUnsavedChanges: boolean) {
  const { registerBlocker, requestNavigation } = useNavigationGuard();

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    return registerBlocker();
  }, [hasUnsavedChanges, registerBlocker]);

  return { requestNavigation };
}
