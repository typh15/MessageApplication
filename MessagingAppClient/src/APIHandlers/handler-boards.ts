import { apiUrl } from './Helpers/config';
import { getStoredUniqueId } from '@/session/session-storage';
import type { MessageBoard } from './Helpers/types';

export async function getMessageBoards(): Promise<MessageBoard[]> {
    const uniqueId = await getStoredUniqueId();

    const apiUrlAddress = await apiUrl(`/message-boards?uniqueId=${encodeURIComponent(uniqueId)}`);
    
    const response = await fetch(apiUrlAddress, {
        method: 'GET',
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

export async function getMessageBoardData(boardId: number): Promise<MessageBoard> {
    const uniqueId = await getStoredUniqueId();

    const apiUrlAddress = await apiUrl(`/message-boards/${boardId}?uniqueId=${encodeURIComponent(uniqueId)}`);
    
    const response = await fetch(apiUrlAddress);
    if (!response.ok) {
        const txt = await response.text();
        console.error('Fetch board data failed:', txt);
        throw new Error('Fetch board data failed');
    }
    return await response.json();
}

export async function GetAllPublicMessageBoardNames(): Promise<string[]> {

    const apiUrlAddress = await apiUrl(`/public-boardnames`);
    
    const response = await fetch(apiUrlAddress);
    if (!response.ok) {
        const txt = await response.text();
        console.error('Fetch public messageboard names failed:', txt);
        throw new Error('Fetch public messageboard names failed:');
    }
    return await response.json();
}
