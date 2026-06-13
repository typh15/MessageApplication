import Message_Class from '@/components/Models/Message_Class';
import AsyncStorage from '@react-native-async-storage/async-storage';

const serverUrl = 'http://100.90.53.59:5121';

export type MessageType = 'text' | 'image';

const MessageTypeValue: Record<MessageType, number> = {
    text: 0,
    image: 1,
};

export interface MessageBoard {
    boardId: number;
    boardName: string;
    visibleToPublic: boolean;
    passwordProtected: boolean;
    uniqueBoardId?: string;
    userRequests?: Array<{ userName: string; uniqueId?: string; address?: string }>;
}

export interface ActiveUserResponse {
    userName: string;
    uniqueId: string;
}

export interface PublicAccountDataResponse {
    uniqueId: string;
    displayName?: string;
    avatarImageId?: string;
    publicBlurb?: string;
}

export interface RegisterUserResponse {
    userName: string;
    uniqueId: string;
    account: PublicAccountDataResponse;
}

export interface ImageDataResponse {
    imageId: string;
    ownerUniqueId: string;
    contentType: string;
    sizeBytes: number;
    originalFileName: string;
    dateTimeOfCreation: string;
}

export interface ImageUploadInput {
    uri: string;
    name?: string;
    type?: string;
}

export interface SendMessageOptions {
    messageType?: MessageType;
    imageId?: string;
}

function normalizeMessageType(messageType: unknown): MessageType {
    if (messageType === 'image' || messageType === 1) {
        return 'image';
    }

    return 'text';
}

function createMessageFromServerMessage(
    msg: any,
    boardId: number,
    fallbackText: string = '',
    fallbackFrom: string = ''
): Message_Class {
    const messageId = msg?.globalId ?? `${boardId}-${msg?.id ?? ''}`;
    const timestamp = msg?.serverTimestamp ?? msg?.clientTimestamp ?? new Date().toISOString();
    const from = msg?.fromUserName ?? fallbackFrom;
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
        imageId
    );
}

async function getStoredUniqueId(): Promise<string> {
    const uniqueId = await AsyncStorage.getItem('uniqueid');

    if (!uniqueId) {
        throw new Error('User is not registered. UniqueId not found.');
    }

    return uniqueId;
}

async function storeUserSession(userName: string, uniqueId: string) {
    await AsyncStorage.setItem('uniqueid', uniqueId);
    await AsyncStorage.setItem('username', userName);
}

export async function registerUser(userName: string): Promise<RegisterUserResponse> {
    const body = {
        UserName: userName,
    };

    const response = await fetch(`${serverUrl}/registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Register user failed:', txt);
        throw new Error('Failed to register user: ' + txt);
    }

    const data = await response.json();
    await storeUserSession(data.userName ?? userName, data.uniqueId);

    return data;
}

export async function createActiveUser(userName: string): Promise<ActiveUserResponse> {
    const registeredUser = await registerUser(userName);

    return {
        userName: registeredUser.userName,
        uniqueId: registeredUser.uniqueId,
    };
}

export async function createAnonymousActiveUser(userName: string): Promise<ActiveUserResponse> {
    const body = {
        UserName: userName,
    };

    const response = await fetch(`${serverUrl}/anonymous-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Create anonymous user failed:', txt);
        throw new Error('Failed to create anonymous user: ' + txt);
    }

    const data = await response.json();
    await storeUserSession(data.userName ?? userName, data.uniqueId);

    return data;
}

export async function getUserAccount(uniqueId: string): Promise<PublicAccountDataResponse> {
    const response = await fetch(`${serverUrl}/user-accounts/${encodeURIComponent(uniqueId)}`);

    if (!response.ok) {
        const txt = await response.text();
        console.error('Get account failed:', txt);
        throw new Error('Failed to get user account');
    }

    return await response.json();
}

export async function updateDisplayName(uniqueId: string, displayName: string): Promise<boolean> {
    return await updateAccountData(uniqueId, 'display-name', { DisplayName: displayName });
}

export async function updatePublicBlurb(uniqueId: string, publicBlurb: string): Promise<boolean> {
    return await updateAccountData(uniqueId, 'public-blurb', { PublicBlurb: publicBlurb });
}

export async function updateAvatarImage(uniqueId: string, avatarImageId: string): Promise<boolean> {
    return await updateAccountData(uniqueId, 'avatar', { AvatarImageId: avatarImageId });
}

async function updateAccountData(
    uniqueId: string,
    fieldName: 'display-name' | 'public-blurb' | 'avatar',
    body: Record<string, string>
): Promise<boolean> {
    const response = await fetch(
        `${serverUrl}/user-accounts/${encodeURIComponent(uniqueId)}/${fieldName}`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }
    );

    if (!response.ok) {
        const txt = await response.text();
        console.error('Update account failed:', txt);
        throw new Error('Failed to update account');
    }

    return true;
}

export async function getMessageBoards(uniqueId: string): Promise<MessageBoard[]> {
    const response = await fetch(`${serverUrl}/message-boards?uniqueId=${encodeURIComponent(uniqueId)}`, {
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

export async function sendMessage(
    text: string,
    from_user: string,
    boardId: number,
    options: SendMessageOptions = {}
): Promise<Message_Class> {
    const existingUniqueId = await getStoredUniqueId();
    const isodate = new Date(Date.now()).toISOString();
    const messageType = options.messageType ?? 'text';

    const formattedMessage = {
        FromUserName: from_user,
        ToUserName: '',
        LocalTimestamp: isodate,
        Content: text,
        UniqueId: existingUniqueId,
        MessageType: MessageTypeValue[messageType],
        ImageId: messageType === 'image' ? options.imageId : undefined,
    };

    const response = await fetch(`${serverUrl}/message-boards/${boardId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedMessage),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from server:', errorText);
        throw new Error('Network response was not ok');
    }

    const returnedData = await response.json();

    try {
        if (returnedData?.uniqueId) {
            await AsyncStorage.setItem('uniqueid', returnedData.uniqueId);
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
    const userName = await AsyncStorage.getItem('username');
    return await sendMessage(caption, userName ?? 'User', boardId, {
        messageType: 'image',
        imageId,
    });
}

export async function fetchMessages(boardId: number, uniqueId: string): Promise<Message_Class[]> {
    const response = await fetch(
        `${serverUrl}/message-boards/${boardId}/messages?uniqueId=${encodeURIComponent(uniqueId)}`
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
    const response = await fetch(
        `${serverUrl}/message-boards/${boardId}/messages/${messageId}?uniqueId=${encodeURIComponent(uniqueId)}`,
        { method: 'DELETE' }
    );

    if (!response.ok) {
        const txt = await response.text();
        console.error('Delete message failed:', txt);
        throw new Error('Delete message failed');
    }

    return true;
}

export async function uploadImage(
    ownerUniqueId: string,
    image: ImageUploadInput
): Promise<ImageDataResponse> {
    const formData = new FormData();
    formData.append('ownerUniqueId', ownerUniqueId);
    formData.append('image', {
        uri: image.uri,
        name: image.name ?? 'image.jpg',
        type: image.type ?? 'image/jpeg',
    } as any);

    const response = await fetch(`${serverUrl}/images`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Upload image failed:', txt);
        throw new Error('Upload image failed');
    }

    return await response.json();
}

export function getImageUrl(imageId: string): string {
    return `${serverUrl}/images/${encodeURIComponent(imageId)}`;
}

export async function getImageMetadata(imageId: string): Promise<ImageDataResponse> {
    const response = await fetch(`${serverUrl}/images/${encodeURIComponent(imageId)}/metadata`);

    if (!response.ok) {
        const txt = await response.text();
        console.error('Get image metadata failed:', txt);
        throw new Error('Get image metadata failed');
    }

    return await response.json();
}

export async function getImagesForOwner(ownerUniqueId: string): Promise<ImageDataResponse[]> {
    const response = await fetch(`${serverUrl}/images/owners/${encodeURIComponent(ownerUniqueId)}`);

    if (!response.ok) {
        const txt = await response.text();
        console.error('Get owner images failed:', txt);
        throw new Error('Get owner images failed');
    }

    return await response.json();
}

export async function deleteImage(imageId: string, ownerUniqueId: string): Promise<boolean> {
    const response = await fetch(
        `${serverUrl}/images/${encodeURIComponent(imageId)}?ownerUniqueId=${encodeURIComponent(ownerUniqueId)}`,
        { method: 'DELETE' }
    );

    if (!response.ok) {
        const txt = await response.text();
        console.error('Delete image failed:', txt);
        throw new Error('Delete image failed');
    }

    return true;
}

export async function approveOfRequestedMembership(boardId: number, memberUniqueId: string, reqUserName: string) {
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

export async function requestBoardMembership(uniqueBoardId: string, reqUserName: string, password?: string) {
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

export async function createMessageBoard(
    uniqueId: string,
    boardName: string,
    visibleToPublic: boolean,
    passwordProtected: boolean,
    password: string
) {
    const body = {
        UniqueId: uniqueId,
        BoardName: boardName,
        VisibleToPublic: visibleToPublic,
        PasswordProtected: passwordProtected,
        Password: password,
    };

    const response = await fetch(`${serverUrl}/message-boards`, {
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
    const uniqueId = await getStoredUniqueId();

    const body = {
        UniqueId: uniqueId,
        Password: password,
    };

    const response = await fetch(`${serverUrl}/message-boards/${boardId}/join`, {
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

export async function getMessageBoardData(uniqueId: string, boardId: number): Promise<MessageBoard> {
    const response = await fetch(`${serverUrl}/message-boards/${boardId}?uniqueId=${encodeURIComponent(uniqueId)}`);
    if (!response.ok) {
        const txt = await response.text();
        console.error('Fetch board data failed:', txt);
        throw new Error('Fetch board data failed');
    }
    return await response.json();
}

export async function GetAllActiveUserNames(): Promise<string[]> {
    const response = await fetch(`${serverUrl}/active-usernames`);
    if (!response.ok) {
        const txt = await response.text();
        console.error('Fetch active usernames failed:', txt);
        throw new Error('Fetch active usernames failed');
    }
    return await response.json();
}

export async function GetAllPublicMessageBoardNames(): Promise<string[]> {
    const response = await fetch(`${serverUrl}/public-boardnames`);
    if (!response.ok) {
        const txt = await response.text();
        console.error('Fetch public messageboard names failed:', txt);
        throw new Error('Fetch public messageboard names failed:');
    }
    return await response.json();
}

export async function validateActiveUser(uniqueId: string): Promise<boolean> {
    const response = await fetch(
        `${serverUrl}/active-users/validate?uniqueId=${encodeURIComponent(uniqueId)}`
    );

    if (!response.ok) {
        return false;
    }

    return await response.json();
}

export async function getBoardJoinRequests(
    boardId: number,
    memberUniqueId: string
): Promise<Array<{ userName: string; uniqueId: string }>> {
    const response = await fetch(
        `${serverUrl}/message-boards/${boardId}/requests?memberUniqueId=${encodeURIComponent(memberUniqueId)}`
    );

    if (!response.ok) {
        throw new Error('Failed to fetch join requests');
    }

    return await response.json();
}
