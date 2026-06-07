
import Message_Class from '@/components/Models/Message_Class';
import AsyncStorage from '@react-native-async-storage/async-storage';

const serverUrl = 'http://100.90.53.59:5121';

export interface MessageBoard {
    boardId: number;
    boardName: string;
    visibleToPublic: boolean;
    passwordProtected: boolean;
}

export interface ActiveUserResponse {
    userName: string;
    uniqueId: string;
}

export async function createActiveUser(userName: string): Promise<ActiveUserResponse> {
    console.log("Creating active user:", userName);
    
    const body = {
        UserName: userName
    };

    const response = await fetch(`${serverUrl}/active-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Create active user failed:', txt);
        throw new Error('Failed to create active user: ' + txt);
    }

    const data = await response.json();
    
    // Store uniqueId locally
    await AsyncStorage.setItem('uniqueid', data.uniqueId);
    
    return data;
}

export async function getMessageBoards(): Promise<MessageBoard[]> {
    console.log("Fetching message boards");
    
    const response = await fetch(`${serverUrl}/message-boards`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Get boards failed:', txt);
        throw new Error('Failed to get message boards');
    }

    return await response.json();
}

export async function sendMessage(text:string, from_user: string, boardId: number) : Promise<Message_Class> {
    console.log("Sending message:", text);

    var existingUniqueId = await AsyncStorage.getItem('uniqueid');
    console.log("Using Unique ID:", existingUniqueId);
    var isodate = new Date(Date.now()).toISOString();
    var formattedMessage = {
        FromUserName: from_user, 
        ToUserName: "", 
        LocalTimestamp: isodate, 
        Content: text, 
        UniqueId: existingUniqueId ?? ""
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

    // Prefer server-provided uniqueId and message payload
    try {
        if (returnedData?.uniqueId) {
            await AsyncStorage.setItem('uniqueid', returnedData.uniqueId);
        }

        const msg = returnedData?.message ?? returnedData;
        const messageId = msg?.globalId ?? `${boardId}-${msg?.id ?? ''}`;
        const timestamp = msg?.serverTimestamp ?? msg?.clientTimestamp ?? isodate;
        const from = msg?.fromUserName ?? from_user;
        const content = msg?.content ?? text;

        return new Message_Class(messageId, from, "", timestamp, content);
    } catch (err) {
        console.warn('Failed to parse server response, falling back to local message', err);
        return new Message_Class(existingUniqueId ?? "", from_user, "", isodate, text);
    }
}

export async function fetchMessages(boardId: number): Promise<Message_Class[]> {
    const response = await fetch(`${serverUrl}/message-boards/${boardId}/messages`);
    if (!response.ok) {
        const txt = await response.text();
        console.error('Fetch messages failed:', txt);
        throw new Error('Network response was not ok');
    }

    const data = await response.json();

    if (!Array.isArray(data)) return [];

    return data.map((msg: any) => {
        const messageId = msg?.globalId ?? `${msg?.parentBoard?.BoardId ?? boardId}-${msg?.id ?? ''}`;
        const timestamp = msg?.serverTimestamp ?? msg?.clientTimestamp ?? new Date().toISOString();
        const from = msg?.fromUserName ?? '';
        const content = msg?.content ?? '';
        return new Message_Class(messageId, from, '', timestamp, content);
    });
}

export async function createMessageBoard(boardName: string, visibleToPublic: boolean, passwordProtected: boolean, password: string) {
    const body = {
        BoardName: boardName,
        VisibleToPublic: visibleToPublic,
        PasswordProtected: passwordProtected,
        Password: password
    };

    const response = await fetch(`${serverUrl}/message-boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Create board failed:', txt);
        throw new Error('Create board failed');
    }

    return await response.json();
}

export async function joinMessageBoard(boardId: number): Promise<boolean> {
    const uniqueId = await AsyncStorage.getItem('uniqueid');

    if (!uniqueId) {
        throw new Error('User is not registered. UniqueId not found.');
    }

    const body = {
        UniqueId: uniqueId
    };

    const response = await fetch(`${serverUrl}/message-boards/${boardId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Join board failed:', txt);
        throw new Error('Join board failed');
    }

    return true;
}

export async function getMessageBoardData(boardId: number): Promise<MessageBoard> {
    const response = await fetch(`${serverUrl}/message-boards/${boardId}`);
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

