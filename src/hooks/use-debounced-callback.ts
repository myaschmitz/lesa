import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a debounced version of `callback` plus a `flush` that runs any pending
 * call immediately. Pending work is automatically flushed on unmount, so a
 * trailing event (e.g. the last reading position) is never lost when a screen
 * closes. `callback` may change between renders; the latest is always used.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArgsRef = useRef<Args | null>(null);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingArgsRef.current) {
      const args = pendingArgsRef.current;
      pendingArgsRef.current = null;
      callbackRef.current(...args);
    }
  }, []);

  const debounced = useCallback(
    (...args: Args) => {
      pendingArgsRef.current = args;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (pendingArgsRef.current) {
          const pending = pendingArgsRef.current;
          pendingArgsRef.current = null;
          callbackRef.current(...pending);
        }
      }, delayMs);
    },
    [delayMs],
  );

  useEffect(() => () => flush(), [flush]);

  return { debounced, flush };
}
