import { useCallback } from 'react';

import * as APIHandler from '@/APIHandlers/ApiHandlerHub';
import { usePolling } from '@/hooks/use-polling';

const BOARD_POLL_INTERVAL_MS = 5000;

export function useBoards(enabled: boolean = true) {
    const loadBoards = useCallback(() => APIHandler.getMessageBoards(), []);

    return usePolling(loadBoards, BOARD_POLL_INTERVAL_MS, enabled);
}
