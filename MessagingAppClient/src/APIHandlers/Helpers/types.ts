export type MessageType = 'text' | 'image';

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
    file?: File;
}

export interface SendMessageOptions {
    messageType?: MessageType;
    imageId?: string;
}

export interface BoardJoinRequest {
    userName: string;
    uniqueId: string;
}
