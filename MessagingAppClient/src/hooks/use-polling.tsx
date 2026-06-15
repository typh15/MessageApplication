import { useCallback, useEffect, useState } from 'react';

export function usePolling<T>(loadData: () => Promise<T>, intervalMs: number, enabled: boolean = true) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<Error | null>(null);

    const refresh = useCallback(async () => {
        if (!enabled) {
            return null;
        }

        try {
            setError(null);
            const result = await loadData();
            setData(result);
            return result;
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
            return null;
        } finally {
            setLoading(false);
        }
    }, [enabled, loadData]);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }

        setLoading(true);
        refresh();

        const intervalId = setInterval(refresh, intervalMs);
        return () => clearInterval(intervalId);
    }, [enabled, intervalMs, refresh]);

    return { data, loading, error, refresh };
}
