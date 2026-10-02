import { useCallback, useEffect, useRef } from 'react';

/**
 * Hands out an AbortSignal per request. Starting a new request aborts the
 * previous one, and any in-flight request is aborted on unmount, so late
 * responses never update state on an unmounted or superseded component.
 */
export function useAbortableRequest(): () => AbortSignal {
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    return controller.signal;
  }, []);
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}
