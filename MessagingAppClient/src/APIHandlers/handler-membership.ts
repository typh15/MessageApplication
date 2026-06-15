import { serverUrl } from './Helpers/config';
import { getStoredUniqueId } from '@/session/session-storage';
import type { BoardJoinRequest } from './Helpers/types';

export async function approveOfRequestedMembership(boardId: number, reqUserName: string) {
    const memberUniqueId = await getStoredUniqueId();
    const response = await fetch(
        `${serverUrl}/message-boards/${boardId}/approvals?memberUniqueId=${encodeURIComponent(memberUniqueId)}&userName=${encodeURIComponent(reqUserName)}`,
        { method: 'POST' }
    );

    if (!response.ok) {
        const txt = await response.text();
        console.error('Failed to Approve of Member Join:', txt);
        throw new Error('Failed to Approve of Member Join');
    }

    return true;
}

export async function requestBoardMembership(uniqueBoardId: string, password?: string) {
    const uniqueId = await getStoredUniqueId();

    const body = {
        UniqueBoardId: uniqueBoardId,
        UniqueId: uniqueId,
        Password: password,
    };

    const response = await fetch(`${serverUrl}/message-boards/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Join board failed:', txt);
        throw new Error('Join board failed');
    }

    return true;
}

export async function getBoardJoinRequests(
    boardId: number
): Promise<BoardJoinRequest[]> {
    const memberUniqueId = await getStoredUniqueId();
    const response = await fetch(
        `${serverUrl}/message-boards/${boardId}/requests?memberUniqueId=${encodeURIComponent(memberUniqueId)}`
    );

    if (!response.ok) {
        throw new Error('Failed to fetch join requests');
    }

    return await response.json();
}
