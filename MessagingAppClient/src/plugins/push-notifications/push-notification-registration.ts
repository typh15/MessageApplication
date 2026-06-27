import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { apiUrl } from '@/APIHandlers/Helpers/config';
import { getSession, type Session } from '@/session/session-storage';

export const PUSH_NOTIFICATION_CHANNEL_ID = 'messages';

export type PushNotificationRegistrationResult =
    | { status: 'registered'; expoPushToken: string }
    | { status: 'skipped'; reason: string };

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

export async function syncPushNotificationRegistration(
    session?: Session | null
): Promise<PushNotificationRegistrationResult> {
    const activeSession = session ?? await getSession();

    if (!activeSession) {
        return { status: 'skipped', reason: 'No saved session.' };
    }

    if (Platform.OS === 'web') {
        return { status: 'skipped', reason: 'Push notifications are only registered on native devices.' };
    }

    await configureNotificationChannelAsync();

    const permission = await getNotificationPermissionAsync();

    if (!permission.granted) {
        return { status: 'skipped', reason: 'Notification permission was not granted.' };
    }

    const projectId = getExpoProjectId();
    const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    await upsertPushNotificationSubscription(activeSession, expoPushToken);

    return { status: 'registered', expoPushToken };
}

export function subscribeToPushTokenRefresh(session: Session) {
    return Notifications.addPushTokenListener((token) => {
        void upsertPushNotificationSubscription(session, token.data).catch((err) => {
            console.warn('Failed to refresh push notification token:', err);
        });
    });
}

async function configureNotificationChannelAsync() {
    if (Platform.OS !== 'android') {
        return;
    }

    await Notifications.setNotificationChannelAsync(PUSH_NOTIFICATION_CHANNEL_ID, {
        name: 'Messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#208AEF',
    });
}

async function getNotificationPermissionAsync() {
    const existingPermission = await Notifications.getPermissionsAsync();

    if (existingPermission.granted) {
        return existingPermission;
    }

    return await Notifications.requestPermissionsAsync();
}

async function upsertPushNotificationSubscription(
    session: Session,
    expoPushToken: string
) {
    const apiUrlAddress = await apiUrl('/push-notifications/subscriptions');
    const response = await fetch(apiUrlAddress, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            UniqueId: session.uniqueId,
            ExpoPushToken: expoPushToken,
            DeviceId: getDeviceId(),
            Platform: Platform.OS,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to save push notification subscription.');
    }
}

function getExpoProjectId() {
    const expoExtra = Constants.expoConfig?.extra as
        | { eas?: { projectId?: string } }
        | undefined;

    const projectId = expoExtra?.eas?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
        throw new Error('Expo project ID is required to register for push notifications.');
    }

    return projectId;
}

function getDeviceId() {
    const constants = Constants as typeof Constants & {
        installationId?: string;
        sessionId?: string;
    };

    return constants.installationId ?? constants.sessionId;
}
