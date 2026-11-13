'use client';

import { useTranslations } from 'next-intl';
import { createContext, type ReactNode, useContext, useEffect } from 'react';

import { ConfirmationDialog } from '@/components/overlays/confirmation-dialog';

import { useNavigationGuardController } from './use-navigation-guard-controller';

type NavigationGuardContextValue = ReturnType<
  typeof useNavigationGuardController
>['value'];

const NavigationGuardContext =
  createContext<NavigationGuardContextValue | null>(null);

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const t = useTranslations('Common.unsavedChanges');
  const { value, isOpen, handleOpenChange, confirmNavigation } =
    useNavigationGuardController();

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}

      <ConfirmationDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
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
