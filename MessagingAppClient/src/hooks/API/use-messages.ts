import { useCallback } from 'react';

import * as APIHandler from '@/APIHandlers/ApiHandlerHub';
import { usePolling } from '@/hooks/use-polling';

const MESSAGE_POLL_INTERVAL_MS = 500;

export function useMessages(boardId: number, enabled: boolean = true) {
    const canLoad = enabled && Number.isFinite(boardId);
    const loadMessages = useCallback(
        () => APIHandler.fetchMessages(boardId),
        [boardId]
    );

    return usePolling(loadMessages, MESSAGE_POLL_INTERVAL_MS, canLoad);
}
