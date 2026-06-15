import { useCallback, useEffect, useState } from 'react';
import {
    clearSession as clearStoredSession,
    getSession,
    type Session,
} from '@/session/session-storage';

export {
    clearSession,
    getSession,
    requireSession,
    saveSession,
    type Session,
} from '@/session/session-storage';

export function useSession() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setSession(await getSession());
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load session.'));
            setSession(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const clear = useCallback(async () => {
        await clearStoredSession();
        setSession(null);
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        session,
        loading,
        error,
        refresh,
        clear,
        isSignedIn: session !== null,
    };
}
