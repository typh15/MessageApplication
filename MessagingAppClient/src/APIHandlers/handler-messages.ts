import Message_Class from '@/components/Models/message-class';

import { apiFetch } from './Helpers/api-fetch';
import { apiUrl } from './Helpers/config';
import { createMessageFromServerMessage } from './Helpers/message-data-transform';
import { getStoredUniqueId, getStoredUserName, storeUniqueId } from '@/session/session-storage';
import type { MessageType, SendMessageOptions } from './Helpers/types';

const MessageTypeValue: Record<MessageType, number> = {
    text: 0,
    image: 1,
};

export async function sendMessage(
    text: string,
    boardId: number,
    options: SendMessageOptions = {}
): Promise<Message_Class> {
    const existingUniqueId = await getStoredUniqueId();
    const from_user = await getStoredUserName() || 'User';
    const isodate = new Date(Date.now()).toISOString();
    const messageType = options.messageType ?? 'text';
    const clientRequestId = createClientRequestId();

    const formattedMessage = {
        FromUserName: from_user,
        ToUserName: '',
        LocalTimestamp: isodate,
        Content: text,
        UniqueId: existingUniqueId,
        MessageType: MessageTypeValue[messageType],
        ImageId: messageType === 'image' ? options.imageId : undefined,
        ClientRequestId: clientRequestId,
    };

    const response = await apiFetch(
        `/message-boards/${boardId}/messages`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formattedMessage),
        },
        { retryMode: 'always' }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from server:', errorText);
        throw new Error('Network response was not ok');
    }

    const returnedData = await response.json();

    try {
        if (returnedData?.uniqueId) {
            await storeUniqueId(returnedData.uniqueId);
        }

        const msg = returnedData?.message ?? returnedData;
        return createMessageFromServerMessage(msg, boardId, text, from_user);
    } catch (err) {
        console.warn('Failed to parse server response, falling back to local message', err);
        return new Message_Class(
            `${boardId}-${Date.now()}`,
            from_user,
            '',
            isodate,
            text,
            messageType,
            options.imageId
        );
    }
}

export async function sendImageMessage(
    boardId: number,
    imageId: string,
    caption: string = ''
): Promise<Message_Class> {
    return await sendMessage(caption, boardId, {
        messageType: 'image',
        imageId,
    });
}

export async function fetchMessages(boardId: number): Promise<Message_Class[]> {
    const uniqueId = await getStoredUniqueId();
    const response = await apiFetch(
        `/message-boards/${boardId}/messages?uniqueId=${encodeURIComponent(uniqueId)}`
    );

    if (!response.ok) {
        const txt = await response.text();
        console.error('Fetch messages failed:', txt);
        throw new Error('Network response was not ok');
    }

    const data = await response.json();

    if (!Array.isArray(data)) return [];

    return data.map((msg: any) => createMessageFromServerMessage(msg, boardId));
}

export async function deleteMessage(boardId: number, messageId: number): Promise<boolean> {
    const uniqueId = await getStoredUniqueId();
    const apiUrlAddress = await apiUrl(`/message-boards/${boardId}/messages/${messageId}?uniqueId=${encodeURIComponent(uniqueId)}`);
    const response = await fetch(apiUrlAddress, { method: 'DELETE' });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Delete message failed:', txt);
        throw new Error('Delete message failed');
    }

    return true;
}

function createClientRequestId() {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }

    const timestamp = Date.now().toString(36);
    const randomPartOne = Math.random().toString(36).slice(2);
    const randomPartTwo = Math.random().toString(36).slice(2);
    return `${timestamp}-${randomPartOne}-${randomPartTwo}`;
}
