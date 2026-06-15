import { serverUrl } from './Helpers/config';
import { getSession, storeUserSession } from '@/session/session-storage';
import type { ActiveUserResponse, RegisterUserResponse } from './Helpers/types';

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

export async function GetAllActiveUserNames(): Promise<string[]> {
    const response = await fetch(`${serverUrl}/active-usernames`);
    if (!response.ok) {
        const txt = await response.text();
        console.error('Fetch active usernames failed:', txt);
        throw new Error('Fetch active usernames failed');
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

export async function validateCurrentSession(): Promise<boolean> {
    const session = await getSession();

    if (!session) {
        return false;
    }

    return await validateActiveUser(session.uniqueId);
}
