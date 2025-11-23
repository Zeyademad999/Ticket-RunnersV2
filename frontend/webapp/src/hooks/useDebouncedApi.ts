import { useState, useEffect, useCallback, useRef } from "react";

interface UseDebouncedApiOptions {
  delay?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export function useDebouncedApi<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = [],
  options: UseDebouncedApiOptions = {}
) {
  const { delay = 300, maxRetries = 3, retryDelay = 1000 } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const timeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  const executeApiCall = useCallback(async () => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      if (isMountedRef.current) {
        setData(result);
        setRetryCount(0);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const error = err as Error;
        setError(error);

        // Auto-retry on certain errors
        if (retryCount < maxRetries && shouldRetry(error)) {
          setTimeout(() => {
            if (isMountedRef.current) {
              setRetryCount((prev) => prev + 1);
              executeApiCall();
            }
          }, retryDelay * (retryCount + 1));
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [apiCall, retryCount, maxRetries, retryDelay]);

  const debouncedExecute = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      executeApiCall();
    }, delay);
  }, [executeApiCall, delay]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    debouncedExecute();
  }, dependencies);

  const retry = useCallback(() => {
    setRetryCount(0);
    executeApiCall();
  }, [executeApiCall]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setRetryCount(0);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    retry,
    reset,
    retryCount,
  };
}

function shouldRetry(error: Error): boolean {
  // Retry on network errors, timeouts, and 5xx server errors
  const message = error.message.toLowerCase();
  return (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504")
  );
}
