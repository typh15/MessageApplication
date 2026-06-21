import Message_Class from '@/components/Models/message-class';

import type { MessageType } from './types';

export function normalizeMessageType(messageType: unknown): MessageType {
    if (messageType === 'image' || messageType === 1) {
        return 'image';
    }

    return 'text';
}

export function createMessageFromServerMessage(
    msg: any,
    boardId: number,
    fallbackText: string = '',
    fallbackFrom: string = ''
): Message_Class {
    const messageId = msg?.globalId ?? `${boardId}-${msg?.id ?? ''}`;
    const timestamp = msg?.serverTimestamp ?? msg?.clientTimestamp ?? new Date().toISOString();
    const from = msg?.fromUserName ?? fallbackFrom;
    const displayName = msg?.fromDisplayName;
    const content = msg?.content ?? fallbackText;
    const messageType = normalizeMessageType(msg?.messageType);
    const imageId = msg?.imageId ?? undefined;

    return new Message_Class(
        messageId,
        from,
        '',
        timestamp,
        content,
        messageType,
        imageId,
        displayName
    );
}
