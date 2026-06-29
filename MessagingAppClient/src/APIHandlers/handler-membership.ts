import { apiUrl } from './Helpers/config';
import { getStoredUniqueId } from '@/session/session-storage';
import type { BoardJoinRequest, MessageBoardInvite, PublicProfileResponse } from './Helpers/types';

export async function approveOfRequestedMembership(boardId: number, reqUserName: string) {
    const memberUniqueId = await getStoredUniqueId();
    const apiUrlAddress = await apiUrl(`/message-boards/${boardId}/approvals?memberUniqueId=${encodeURIComponent(memberUniqueId)}&userName=${encodeURIComponent(reqUserName)}`);
    const response = await fetch(apiUrlAddress, { method: 'POST' });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Failed to Approve of Member Join:', txt);
        throw new Error('Failed to Approve of Member Join');
    }

    return true;
}

export async function denyRequestedMembership(boardId: number, reqUserName: string) {
    const memberUniqueId = await getStoredUniqueId();
    const apiUrlAddress = await apiUrl(`/message-boards/${boardId}/denials?memberUniqueId=${encodeURIComponent(memberUniqueId)}&userName=${encodeURIComponent(reqUserName)}`);
    const response = await fetch(apiUrlAddress, { method: 'POST' });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Failed to Deny Member Join:', txt);
        throw new Error('Failed to Deny Member Join');
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

    const apiUrlAddress = await apiUrl('/message-boards/search');
    const response = await fetch(apiUrlAddress, {
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

export async function joinBoardByCode(uniqueBoardId: string, password: string): Promise<boolean> {
    const uniqueId = await getStoredUniqueId();

    const body = {
        UniqueBoardId: uniqueBoardId,
        UniqueId: uniqueId,
        Password: password,
    };

    const apiUrlAddress = await apiUrl('/message-boards/join-by-code');
    const response = await fetch(apiUrlAddress, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Join board by code failed:', txt);
        throw new Error('Unable to join with that board ID and password.');
    }

    return true;
}

export async function leaveBoard(boardId: number): Promise<boolean> {
    const uniqueId = await getStoredUniqueId();
    const apiUrlAddress = await apiUrl(`/message-boards/${boardId}/memberships/self?uniqueId=${encodeURIComponent(uniqueId)}`);
    const response = await fetch(apiUrlAddress, { method: 'DELETE' });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Leave board failed:', txt);
        throw new Error('Unable to leave message board. You may not be a member of this board.');
    }

    return true;
}

export async function inviteUserToBoard(boardId: number, inviteUserName: string): Promise<boolean> {
    const memberUniqueId = await getStoredUniqueId();
    const apiUrlAddress = await apiUrl(`/message-boards/${boardId}/invites?memberUniqueId=${encodeURIComponent(memberUniqueId)}&inviteUserName=${encodeURIComponent(inviteUserName)}`);
    const response = await fetch(apiUrlAddress, { method: 'POST' });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Invite user failed:', txt);
        throw new Error('Unable to invite that user.');
    }

    return true;
}

export async function getUserBoardInvites(): Promise<MessageBoardInvite[]> {
    const uniqueId = await getStoredUniqueId();
    const apiUrlAddress = await apiUrl(`/active-users/${encodeURIComponent(uniqueId)}/invites`);
    const response = await fetch(apiUrlAddress);

    if (!response.ok) {
        const txt = await response.text();
        console.error('Load board invites failed:', txt);
        throw new Error('Failed to load board invites');
    }

    return await response.json();
}

export async function acceptBoardInvite(boardId: number): Promise<boolean> {
    const uniqueId = await getStoredUniqueId();
    const apiUrlAddress = await apiUrl(`/message-boards/${boardId}/invites/accept?uniqueId=${encodeURIComponent(uniqueId)}`);
    const response = await fetch(apiUrlAddress, { method: 'POST' });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Accept board invite failed:', txt);
        throw new Error('Unable to accept board invite.');
    }

    return true;
}

export async function rejectBoardInvite(boardId: number): Promise<boolean> {
    const uniqueId = await getStoredUniqueId();
    const apiUrlAddress = await apiUrl(`/message-boards/${boardId}/invites/reject?uniqueId=${encodeURIComponent(uniqueId)}`);
    const response = await fetch(apiUrlAddress, { method: 'POST' });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Reject board invite failed:', txt);
        throw new Error('Unable to decline board invite.');
    }

    return true;
}

export async function getBoardJoinRequests(
    boardId: number
): Promise<BoardJoinRequest[]> {
    const memberUniqueId = await getStoredUniqueId();
    const apiUrlAddress = await apiUrl(`/message-boards/${boardId}/requests?memberUniqueId=${encodeURIComponent(memberUniqueId)}`);
    const response = await fetch(apiUrlAddress);

    if (!response.ok) {
        throw new Error('Failed to fetch join requests');
    }

    return await response.json();
}

export async function getBoardMembers(boardId: number): Promise<PublicProfileResponse[]> {
    const uniqueId = await getStoredUniqueId();
    const apiUrlAddress = await apiUrl(`/message-boards/${boardId}/members?uniqueId=${encodeURIComponent(uniqueId)}`);
    const response = await fetch(apiUrlAddress);

    if (!response.ok) {
        const txt = await response.text();
        console.error('Load board members failed:', txt);
        throw new Error('Failed to load board members');
    }

    return await response.json();
}
