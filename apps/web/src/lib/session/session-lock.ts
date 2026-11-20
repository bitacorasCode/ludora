'use client';

const SESSION_LOCK_NAME = 'ludora-session';

export async function withSessionLock<T>(operation: () => Promise<T>): Promise<T> {
    const locks = navigator.locks;

    return locks ? await locks.request(SESSION_LOCK_NAME, operation) : operation();
}
