import { useRef, useCallback } from 'react';

export function useIdempotency() {
  const keyRef = useRef<string | null>(null);
  if (!keyRef.current) {
    keyRef.current = crypto.randomUUID();
  }
  const resetKey = useCallback(() => {
    keyRef.current = crypto.randomUUID();
  }, []);
  return { 
    key: keyRef.current, 
    resetKey 
  };
}