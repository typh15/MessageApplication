import { apiUrl } from './Helpers/config';
import { getSession, storeUserSession } from '@/session/session-storage';
import type { ActiveUserResponse, RegisterUserResponse } from './Helpers/types';

export async function registerUser(userName: string, password: string): Promise<RegisterUserResponse> {
    
    const apiUrlAddress = await apiUrl(`/registration`);

    const body = {
        UserName: userName,
        Password: password,
    };
    
    const response = await fetch(apiUrlAddress, {
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

export async function createActiveUser(
    userName: string,
    password: string
): Promise<ActiveUserResponse> {
    const registeredUser = await registerUser(userName, password);

    return {
        userName: registeredUser.userName,
        uniqueId: registeredUser.uniqueId,
    };
}

export async function createPasswordProtectedUser(
    userName: string,
    password: string
): Promise<ActiveUserResponse> {
    return await createActiveUser(userName, password);
}

export async function loginUser(
    userName: string,
    password: string
): Promise<RegisterUserResponse> {
    const apiUrlAddress = await apiUrl(`/login`);

    const body = {
        UserName: userName,
        Password: password,
    };

    const response = await fetch(apiUrlAddress, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const txt = await response.text();
        console.error('Login user failed:', txt);
        throw new Error(txt || 'Invalid username or password.');
    }

    const data = await response.json();
    await storeUserSession(data.userName ?? userName, data.uniqueId);

    return data;
}

export async function createAnonymousActiveUser(userName: string): Promise<ActiveUserResponse> {
    
    const apiUrlAddress = await apiUrl(`/anonymous-users`);

    const body = {
        UserName: userName,
    };

    const response = await fetch(apiUrlAddress, {
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

    const apiUrlAddress = await apiUrl(`/active-usernames`);

    const response = await fetch(apiUrlAddress);
    if (!response.ok) {
        const txt = await response.text();
        console.error('Fetch active usernames failed:', txt);
        throw new Error('Fetch active usernames failed');
    }
    return await response.json();
}

export async function validateActiveUser(uniqueId: string): Promise<boolean> {

    const apiUrlAddress = await apiUrl(`/active-users/validate?uniqueId=${encodeURIComponent(uniqueId)}`);

    const response = await fetch(apiUrlAddress);

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
