import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLocalStorageStore } from './local-storage';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createLocalStorageStore', () => {
  it('reads existing values and returns null for missing values', () => {
    const store = createLocalStorageStore('profile');
    expect(store.getSnapshot()).toBeNull();
    localStorage.setItem('profile', 'saved');
    expect(store.getSnapshot()).toBe('saved');
  });

  it('notifies subscribers when saving and removing its value', () => {
    const store = createLocalStorageStore('profile');
    const onChange = vi.fn();
    const unsubscribe = store.subscribe(onChange);
    try {
      store.set('saved');
      expect(store.getSnapshot()).toBe('saved');
      expect(onChange).toHaveBeenCalledOnce();
      store.remove();
      expect(store.getSnapshot()).toBeNull();
      expect(onChange).toHaveBeenCalledTimes(2);
    } finally {
      unsubscribe();
    }
  });

  it('shares local changes between stores using the same key', () => {
    const first = createLocalStorageStore('profile');
    const second = createLocalStorageStore('profile');
    const onChange = vi.fn();
    const unsubscribe = second.subscribe(onChange);
    try {
      first.set('shared');
      expect(second.getSnapshot()).toBe('shared');
      expect(onChange).toHaveBeenCalledOnce();
      createLocalStorageStore('other').set('unrelated');
      expect(onChange).toHaveBeenCalledOnce();
    } finally {
      unsubscribe();
    }
  });

  it('reacts to its key and clear events from another tab', () => {
    const onChange = vi.fn();
    const unsubscribe = createLocalStorageStore('profile').subscribe(onChange);
    try {
      window.dispatchEvent(new StorageEvent('storage', { key: 'other' }));
      expect(onChange).not.toHaveBeenCalled();
      window.dispatchEvent(new StorageEvent('storage', { key: 'profile' }));
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
      expect(onChange).toHaveBeenCalledTimes(2);
    } finally {
      unsubscribe();
    }
  });

  it('stops receiving local and cross-tab changes after unsubscribing', () => {
    const store = createLocalStorageStore('profile');
    const onChange = vi.fn();
    const unsubscribe = store.subscribe(onChange);
    unsubscribe();
    store.set('saved');
    window.dispatchEvent(new StorageEvent('storage', { key: 'profile' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('returns null when the browser blocks storage reads', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError');
    });
    expect(createLocalStorageStore('profile').getSnapshot()).toBeNull();
  });

  it('propagates write errors without announcing a successful change', () => {
    const store = createLocalStorageStore('profile');
    const onChange = vi.fn();
    const unsubscribe = store.subscribe(onChange);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    });
    try {
      expect(() => store.set('saved')).toThrow('Storage full');
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it('propagates removal errors without announcing a successful change', () => {
    const store = createLocalStorageStore('profile');
    const onChange = vi.fn();
    const unsubscribe = store.subscribe(onChange);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError');
    });
    try {
      expect(() => store.remove()).toThrow('Storage blocked');
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });
});
