import { useCallback } from 'react';

import * as APIHandler from '@/APIHandlers/ApiHandlerHub';
import { usePolling } from '@/hooks/use-polling';

const BOARD_DETAILS_POLL_INTERVAL_MS = 5000;

export function useBoardDetails(boardId: number, enabled: boolean = true) {
    const canLoad = enabled && Number.isFinite(boardId);
    const loadBoardDetails = useCallback(
        () => APIHandler.getMessageBoardData(boardId),
        [boardId]
    );

    return usePolling(loadBoardDetails, BOARD_DETAILS_POLL_INTERVAL_MS, canLoad);
}
