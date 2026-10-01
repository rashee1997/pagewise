import { useCallback, useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
}

/** Boolean flag persisted in localStorage; hydration-safe (false on the server) and tolerant of blocked storage. */
export function useLocalStorageFlag(key: string): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) === '1';
      } catch {
        return false;
      }
    },
    () => false
  );
  const setValue = useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(key, next ? '1' : '0');
      } catch {
        // storage unavailable
      }
      notify();
    },
    [key]
  );
  return [value, setValue];
}
