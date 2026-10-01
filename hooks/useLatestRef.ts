import { useEffect, useRef } from 'react';

/** Ref that always holds the latest value (updated after commit, safe for event handlers and timers). */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
