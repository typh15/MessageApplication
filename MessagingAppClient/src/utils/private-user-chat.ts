export const PRIVATE_USER_CHAT_BOARD_PREFIX = 'USERCHAT:';

export type PrivateUserChatParticipants = {
    firstUserName: string;
    secondUserName: string;
};

export type PrivateUserChatParticipantLabel = {
    userName: string;
    displayName?: string | null;
};

const privateUserChatBoardNamePattern = /^USERCHAT:<([^<>]+)><([^<>]+)>$/;
const hiddenPasswordByteCount = 48;

function cleanUserName(userName: string): string {
    return userName.trim();
}

function canUseUserNameInBoardName(userName: string): boolean {
    const trimmedUserName = cleanUserName(userName);
    return trimmedUserName.length > 0 && !/[<>]/.test(trimmedUserName);
}

function compareUserNames(leftUserName: string, rightUserName: string): number {
    const leftKey = leftUserName.toLowerCase();
    const rightKey = rightUserName.toLowerCase();

    if (leftKey < rightKey) return -1;
    if (leftKey > rightKey) return 1;
    return leftUserName < rightUserName ? -1 : leftUserName > rightUserName ? 1 : 0;
}

export function createPrivateUserChatBoardName(
    currentUserName: string,
    otherUserName: string
): string | null {
    const firstUserName = cleanUserName(currentUserName);
    const secondUserName = cleanUserName(otherUserName);

    if (
        !canUseUserNameInBoardName(firstUserName) ||
        !canUseUserNameInBoardName(secondUserName) ||
        firstUserName.toLowerCase() === secondUserName.toLowerCase()
    ) {
        return null;
    }

    const [canonicalFirstUserName, canonicalSecondUserName] =
        compareUserNames(firstUserName, secondUserName) <= 0
            ? [firstUserName, secondUserName]
            : [secondUserName, firstUserName];

    return `${PRIVATE_USER_CHAT_BOARD_PREFIX}<${canonicalFirstUserName}><${canonicalSecondUserName}>`;
}

export function parsePrivateUserChatBoardName(
    boardName: string
): PrivateUserChatParticipants | null {
    const match = boardName.trim().match(privateUserChatBoardNamePattern);

    if (!match) {
        return null;
    }

    return {
        firstUserName: match[1],
        secondUserName: match[2],
    };
}

export function isPrivateUserChatBoardName(boardName: string): boolean {
    return parsePrivateUserChatBoardName(boardName) !== null;
}

export function getOtherPrivateUserChatUserName(
    boardName: string,
    currentUserName: string | null | undefined
): string | null {
    const currentCleanUserName = cleanUserName(currentUserName ?? '');
    const participants = parsePrivateUserChatBoardName(boardName);

    if (!participants || !currentCleanUserName) {
        return null;
    }

    if (participants.firstUserName.toLowerCase() === currentCleanUserName.toLowerCase()) {
        return participants.secondUserName;
    }

    if (participants.secondUserName.toLowerCase() === currentCleanUserName.toLowerCase()) {
        return participants.firstUserName;
    }

    return null;
}

export function formatPrivateUserChatParticipantLabel({
    userName,
    displayName,
}: PrivateUserChatParticipantLabel): string {
    const cleanDisplayName = displayName?.trim();
    const cleanParticipantUserName = cleanUserName(userName);

    if (!cleanDisplayName || cleanDisplayName === cleanParticipantUserName) {
        return cleanParticipantUserName;
    }

    return `${cleanDisplayName} (${cleanParticipantUserName})`;
}

export function createHiddenPrivateUserChatPassword(): string {
    const randomBytes = new Uint8Array(hiddenPasswordByteCount);

    try {
        if (globalThis.crypto?.getRandomValues) {
            globalThis.crypto.getRandomValues(randomBytes);
        } else {
            fillWithFallbackRandomBytes(randomBytes);
        }
    } catch {
        fillWithFallbackRandomBytes(randomBytes);
    }

    return Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fillWithFallbackRandomBytes(randomBytes: Uint8Array) {
    for (let index = 0; index < randomBytes.length; index += 1) {
        randomBytes[index] = Math.floor(Math.random() * 256);
    }
}
