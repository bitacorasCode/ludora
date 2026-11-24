'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { useSessionActivity } from './use-session-activity';
import { useSessionRecoveryController } from './use-session-recovery-controller';

type SessionRecoveryContextValue = ReturnType<
  typeof useSessionRecoveryController
>;

const SessionRecoveryContext =
  createContext<SessionRecoveryContextValue | null>(null);

export function SessionBoundary({ children }: { children: ReactNode }) {
  const value = useSessionRecoveryController();

  return (
    <SessionRecoveryContext.Provider value={value}>
      {children}
    </SessionRecoveryContext.Provider>
  );
}

export function SessionActivity() {
  const { recoverSession } = useSessionRecovery();
  useSessionActivity(recoverSession);

  return null;
}

export function useSessionRecovery() {
  const context = useContext(SessionRecoveryContext);

  if (!context) {
    throw new Error('SessionBoundary is required to recover a session.');
  }

  return context;
}
