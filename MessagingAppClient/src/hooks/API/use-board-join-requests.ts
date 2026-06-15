import { useCallback } from 'react';

import {usePolling} from '@/hooks/use-polling';
import * as APIHandler from '@/APIHandlers/ApiHandlerHub';

const BOARD_JOIN_REQUEST_POLL_INTERVAL_MS = 5000;

export function useBoardJoinRequests(boardId: number, enabled: boolean = true) {
  const canLoad = enabled && Number.isFinite(boardId);
  const loadBoardJoinRequests = useCallback(
    () => APIHandler.getBoardJoinRequests(boardId),
    [boardId]
  );

  return usePolling(
    loadBoardJoinRequests,
    BOARD_JOIN_REQUEST_POLL_INTERVAL_MS,
    canLoad
  );
}
