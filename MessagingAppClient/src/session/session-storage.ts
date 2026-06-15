import AsyncStorage from '@react-native-async-storage/async-storage';

const UNIQUE_ID_KEY = 'uniqueid';
const USERNAME_KEY = 'username';

export type Session = {
    uniqueId: string;
    userName: string;
};

export async function getSession(): Promise<Session | null> {
    const uniqueId = await AsyncStorage.getItem(UNIQUE_ID_KEY);
    const userName = await AsyncStorage.getItem(USERNAME_KEY);

    if (!uniqueId || !userName) {
        return null;
    }

    return { uniqueId, userName };
}

export async function requireSession(): Promise<Session> {
    const session = await getSession();

    if (!session) {
        throw new Error('No saved session found. Please register or log in first.');
    }

    return session;
}

export async function saveSession(session: Session) {
    await AsyncStorage.setItem(UNIQUE_ID_KEY, session.uniqueId);
    await AsyncStorage.setItem(USERNAME_KEY, session.userName);
}

export async function clearSession() {
    await AsyncStorage.removeItem(UNIQUE_ID_KEY);
    await AsyncStorage.removeItem(USERNAME_KEY);
}

export async function getStoredUniqueId(): Promise<string> {
    const session = await getSession();

    if (!session) {
        throw new Error('User is not registered. UniqueId not found.');
    }

    return session.uniqueId;
}

export async function getStoredUserName(): Promise<string | null> {
    const session = await getSession();
    return session?.userName ?? null;
}

export async function storeUserSession(userName: string, uniqueId: string) {
    await saveSession({ uniqueId, userName });
}

export async function storeUniqueId(uniqueId: string) {
    const existingUserName = await AsyncStorage.getItem(USERNAME_KEY);

    await AsyncStorage.setItem(UNIQUE_ID_KEY, uniqueId);

    if (!existingUserName) {
        await AsyncStorage.setItem(USERNAME_KEY, 'User');
    }
}
