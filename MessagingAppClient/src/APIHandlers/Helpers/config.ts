import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL_KEY = 'serverUrl';

export const DEFAULT_SERVER_URL = 'http://100.90.53.59:5121';

let currentServerUrl = DEFAULT_SERVER_URL;

function normalizeServerUrl(value?: string | null) {
    return value?.trim().replace(/\/+$/, '') || null;
}

export function getServerUrlSync(): string {
    return currentServerUrl;
}

export async function loadServerUrl(): Promise<string> {
    const storedUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
    currentServerUrl = normalizeServerUrl(storedUrl) ?? DEFAULT_SERVER_URL;
    return currentServerUrl;
}

export async function getServerUrl(): Promise<string> {
    return await loadServerUrl();
}

export async function saveServerUrl(value: string) {
    const normalizedUrl = normalizeServerUrl(value) ?? DEFAULT_SERVER_URL;
    currentServerUrl = normalizedUrl;

    if (normalizedUrl === DEFAULT_SERVER_URL) {
        await AsyncStorage.removeItem(SERVER_URL_KEY);
    } else {
        await AsyncStorage.setItem(SERVER_URL_KEY, normalizedUrl);
    }
}

export async function apiUrl(path: string): Promise<string> {
    const baseUrl = await loadServerUrl();
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
}

export function apiUrlSync(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${currentServerUrl}${normalizedPath}`;
}
