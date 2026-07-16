import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_POLL_BACKOFF_MS = 30_000;

type LoadResult<T> = {
    data: T | null;
    succeeded: boolean;
};

export function usePolling<T>(loadData: () => Promise<T>, intervalMs: number, enabled: boolean = true) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<Error | null>(null);
    const inFlightRequestRef = useRef<Promise<LoadResult<T>> | null>(null);
    const generationRef = useRef(0);

    const runLoad = useCallback((): Promise<LoadResult<T>> => {
        if (!enabled) {
            return Promise.resolve({ data: null, succeeded: true });
        }

        if (inFlightRequestRef.current) {
            return inFlightRequestRef.current;
        }

        const generation = generationRef.current;
        const request = (async (): Promise<LoadResult<T>> => {
            try {
                // Defer invocation so the request ref is assigned even if loadData throws synchronously.
                const result = await Promise.resolve().then(loadData);

                if (generation === generationRef.current) {
                    setData(result);
                    setError(null);
                }

                return { data: result, succeeded: true };
            } catch (err) {
                if (generation === generationRef.current) {
                    setError(err instanceof Error ? err : new Error('Unknown error'));
                }

                return { data: null, succeeded: false };
            } finally {
                if (generation === generationRef.current) {
                    setLoading(false);
                    inFlightRequestRef.current = null;
                }
            }
        })();

        inFlightRequestRef.current = request;
        return request;
    }, [enabled, loadData]);

    const refresh = useCallback(async () => {
        const result = await runLoad();
        return result.data;
    }, [runLoad]);

    useEffect(() => {
        generationRef.current += 1;
        const generation = generationRef.current;

        if (!enabled) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        let failureCount = 0;
        let timerId: ReturnType<typeof setTimeout> | null = null;

        setLoading(true);

        const poll = async () => {
            const result = await runLoad();

            if (cancelled || generation !== generationRef.current) {
                return;
            }

            failureCount = result.succeeded ? 0 : failureCount + 1;
            const nextDelayMs = result.succeeded
                ? intervalMs
                : calculateBackoffMs(intervalMs, failureCount);

            timerId = setTimeout(poll, nextDelayMs);
        };

        poll();

        return () => {
            cancelled = true;
            generationRef.current += 1;
            inFlightRequestRef.current = null;

            if (timerId !== null) {
                clearTimeout(timerId);
            }
        };
    }, [enabled, intervalMs, runLoad]);

    return { data, loading, error, refresh };
}

function calculateBackoffMs(intervalMs: number, failureCount: number) {
    const exponentialDelayMs = intervalMs * 2 ** Math.min(failureCount, 6);
    return Math.min(exponentialDelayMs, MAX_POLL_BACKOFF_MS);
}
