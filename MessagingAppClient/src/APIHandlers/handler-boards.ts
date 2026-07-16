import { apiFetch } from './Helpers/api-fetch';
import { apiUrl } from './Helpers/config';
import { getStoredUniqueId } from '@/session/session-storage';
import type { MessageBoard } from './Helpers/types';

export async function getMessageBoards(): Promise<MessageBoard[]> {
    const uniqueId = await getStoredUniqueId();

    const response = await apiFetch(`/message-boards?uniqueId=${encodeURIComponent(uniqueId)}`, {
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Get boards failed:', txt);
        throw new Error('Failed to get message boards');
    }

    return await response.json();
}

export async function createMessageBoard(
    boardName: string,
    visibleToPublic: boolean,
    passwordProtected: boolean,
    password: string
): Promise<MessageBoard> {

    const apiUrlAddress = await apiUrl(`/message-boards`);
    
    const uniqueId = await getStoredUniqueId();
    const body = {
        UniqueId: uniqueId,
        BoardName: boardName,
        VisibleToPublic: visibleToPublic,
        PasswordProtected: passwordProtected,
        Password: password,
    };

    const response = await fetch(apiUrlAddress, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Create board failed:', txt);
        throw new Error('Create board failed');
    }

    return await response.json();
}

export async function joinMessageBoard(boardId: number, password?: string): Promise<boolean> {

    const apiUrlAddress = await apiUrl(`/message-boards/${boardId}/join`);
    
    const uniqueId = await getStoredUniqueId();

    const body = {
        UniqueId: uniqueId,
        Password: password,
    };

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

export async function addFavoriteBoard(boardId: number): Promise<boolean> {
    const uniqueId = await getStoredUniqueId();

    const apiUrlAddress = await apiUrl(
        `/message-boards/${boardId}/favorite?uniqueId=${encodeURIComponent(uniqueId)}`
    );

    const response = await fetch(apiUrlAddress, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Favorite board failed:', txt);
        throw new Error('Favorite board failed');
    }

    return true;
}

export async function removeFavoriteBoard(boardId: number): Promise<boolean> {
    const uniqueId = await getStoredUniqueId();

    const apiUrlAddress = await apiUrl(
        `/message-boards/${boardId}/favorite?uniqueId=${encodeURIComponent(uniqueId)}`
    );

    const response = await fetch(apiUrlAddress, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Remove favorite board failed:', txt);
        throw new Error('Remove favorite board failed');
    }

    return true;
}

export async function getMessageBoardData(boardId: number): Promise<MessageBoard> {
    const uniqueId = await getStoredUniqueId();

    const response = await apiFetch(
        `/message-boards/${boardId}?uniqueId=${encodeURIComponent(uniqueId)}`
    );
    if (!response.ok) {
        const txt = await response.text();
        console.error('Fetch board data failed:', txt);
        throw new Error('Fetch board data failed');
    }
    return await response.json();
}

export async function GetAllPublicMessageBoardNames(): Promise<string[]> {

    const response = await apiFetch('/public-boardnames');
    if (!response.ok) {
        const txt = await response.text();
        console.error('Fetch public messageboard names failed:', txt);
        throw new Error('Fetch public messageboard names failed:');
    }
    return await response.json();
}
