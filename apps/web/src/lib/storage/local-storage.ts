const STORAGE_CHANGE_EVENT = 'ludora:local-storage-change';

type StorageChangeEvent = CustomEvent<{ key: string }>;

export function createLocalStorageStore(key: string) {
  function getSnapshot(): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function getServerSnapshot(): undefined {
    return undefined;
  }

  function subscribe(onStoreChange: () => void) {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) onStoreChange();
    };

    const onLocalChange = (event: Event) => {
      if ((event as StorageChangeEvent).detail.key === key) onStoreChange();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(STORAGE_CHANGE_EVENT, onLocalChange);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(STORAGE_CHANGE_EVENT, onLocalChange);
    };
  }

  function notifyChange() {
    window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key } }));
  }

  function set(value: string) {
    window.localStorage.setItem(key, value);
    notifyChange();
  }

  function remove() {
    window.localStorage.removeItem(key);
    notifyChange();
  }

  return { getSnapshot, getServerSnapshot, subscribe, set, remove };
}
