import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { apiUrl } from '@/APIHandlers/Helpers/config';
import { getSession, type Session } from '@/session/session-storage';

import {
    getPushNotificationAvailability,
    getPushNotificationMode,
    getPushNotificationRuntimeDetails,
} from './push-notification-mode';

export const PUSH_NOTIFICATION_CHANNEL_ID = 'messages';

export type PushNotificationRegistrationResult =
    | { status: 'registered'; expoPushToken: string }
    | { status: 'skipped'; reason: string };

export type PushNotificationDiagnosticsResult = {
    status: 'registered' | 'skipped' | 'failed';
    message: string;
    details: string[];
};

type NotificationsModule = typeof import('expo-notifications');
type PushTokenSubscription = {
    remove: () => void;
};

let notificationsModulePromise: Promise<NotificationsModule> | null = null;
let notificationHandlerConfigured = false;

export async function syncPushNotificationRegistration(
    session?: Session | null
): Promise<PushNotificationRegistrationResult> {
    const activeSession = session ?? await getSession();

    if (!activeSession) {
        return { status: 'skipped', reason: 'No saved session.' };
    }

    const availability = getPushNotificationAvailability();

    if (!availability.enabled) {
        return {
            status: 'skipped',
            reason: availability.reason ?? 'Push notifications are not available.',
        };
    }

    const Notifications = await loadPushNotificationsModuleAsync();

    if (!Notifications) {
        return { status: 'skipped', reason: 'Push notifications are not available.' };
    }

    await configureNotificationChannelAsync(Notifications);

    const permission = await getNotificationPermissionAsync(Notifications);

    if (!permission.granted) {
        return { status: 'skipped', reason: 'Notification permission was not granted.' };
    }

    const projectId = getExpoProjectId();
    const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    await upsertPushNotificationSubscription(activeSession, expoPushToken);

    return { status: 'registered', expoPushToken };
}

export async function diagnosePushNotificationRegistration(
    session?: Session | null
): Promise<PushNotificationDiagnosticsResult> {
    const details: string[] = [
        `Mode: ${getPushNotificationMode()}`,
        ...getPushNotificationRuntimeDetails(),
    ];
    const activeSession = session ?? await getSession();

    if (!activeSession) {
        return {
            status: 'skipped',
            message: 'No saved session was found.',
            details,
        };
    }

    details.push(`User: ${activeSession.userName}`);

    const availability = getPushNotificationAvailability();
    if (!availability.enabled) {
        return {
            status: 'skipped',
            message: availability.reason ?? 'Push notifications are not available.',
            details,
        };
    }

    details.push('Availability: enabled');

    const Notifications = await tryStep(
        details,
        'Notification module',
        () => loadPushNotificationsModuleAsync()
    );

    if (!Notifications) {
        return {
            status: 'failed',
            message: 'The notification module could not be loaded.',
            details,
        };
    }

    const channelConfigured = await tryStep(
        details,
        'Android channel',
        async () => {
            await configureNotificationChannelAsync(Notifications);
            return true;
        }
    );

    if (!channelConfigured) {
        return {
            status: 'failed',
            message: 'Android notification channel setup failed.',
            details,
        };
    }

    const permission = await tryStep(
        details,
        'Permission',
        () => getNotificationPermissionAsync(Notifications),
        (result) => result.granted ? 'granted' : 'not granted'
    );

    if (!permission?.granted) {
        return {
            status: 'skipped',
            message: 'Notification permission was not granted.',
            details,
        };
    }

    const projectId = trySyncStep(
        details,
        'Expo project ID',
        getExpoProjectId,
        (result) => result
    );

    if (!projectId) {
        return {
            status: 'failed',
            message: 'Expo project ID is missing.',
            details,
        };
    }

    const expoPushToken = await tryStep(
        details,
        'Expo push token',
        async () => (await Notifications.getExpoPushTokenAsync({ projectId })).data,
        maskPushToken
    );

    if (!expoPushToken) {
        return {
            status: 'failed',
            message: 'Expo push token could not be created.',
            details,
        };
    }

    const subscriptionApiUrl = await tryStep(
        details,
        'Backend endpoint',
        () => apiUrl('/push-notifications/subscriptions'),
        (result) => result
    );

    if (!subscriptionApiUrl) {
        return {
            status: 'failed',
            message: 'The backend endpoint URL could not be created.',
            details,
        };
    }

    const saved = await tryStep(
        details,
        'Backend save',
        async () => {
            await upsertPushNotificationSubscription(
                activeSession,
                expoPushToken,
                subscriptionApiUrl
            );
            return true;
        }
    );

    if (!saved) {
        return {
            status: 'failed',
            message: 'The backend did not save the push token.',
            details,
        };
    }

    return {
        status: 'registered',
        message: 'Push notification registration succeeded.',
        details,
    };
}

export function subscribeToPushTokenRefresh(session: Session) {
    let subscription: PushTokenSubscription | null = null;
    let removed = false;

    void loadPushNotificationsModuleAsync()
        .then((Notifications) => {
            if (!Notifications || removed) {
                return;
            }

            subscription = Notifications.addPushTokenListener((token) => {
                void upsertPushNotificationSubscription(session, token.data).catch((err) => {
                    console.warn('Failed to refresh push notification token:', err);
                });
            });
        })
        .catch((err) => {
            console.warn('Failed to start push notification token refresh listener:', err);
        });

    return {
        remove: () => {
            removed = true;
            subscription?.remove();
        },
    };
}

export async function loadPushNotificationsModuleAsync() {
    const availability = getPushNotificationAvailability();

    if (!availability.enabled) {
        return null;
    }

    notificationsModulePromise ??= import('expo-notifications');
    const Notifications = await notificationsModulePromise;

    if (!notificationHandlerConfigured) {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: false,
                shouldSetBadge: false,
            }),
        });

        notificationHandlerConfigured = true;
    }

    return Notifications;
}

async function configureNotificationChannelAsync(Notifications: NotificationsModule) {
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

async function getNotificationPermissionAsync(Notifications: NotificationsModule) {
    const existingPermission = await Notifications.getPermissionsAsync();

    if (existingPermission.granted) {
        return existingPermission;
    }

    return await Notifications.requestPermissionsAsync();
}

async function upsertPushNotificationSubscription(
    session: Session,
    expoPushToken: string,
    subscriptionApiUrl?: string
) {
    const apiUrlAddress = subscriptionApiUrl ?? await apiUrl('/push-notifications/subscriptions');
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
        throw new Error(
            errorText ||
            `Failed to save push notification subscription. Status: ${response.status}`
        );
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

async function tryStep<T>(
    details: string[],
    label: string,
    action: () => Promise<T>,
    formatResult: (result: T) => string = () => 'ok'
): Promise<T | null> {
    try {
        const result = await action();
        details.push(`${label}: ${formatResult(result)}`);
        return result;
    }
    catch (err) {
        details.push(`${label}: failed - ${getErrorMessage(err)}`);
        return null;
    }
}

function trySyncStep<T>(
    details: string[],
    label: string,
    action: () => T,
    formatResult: (result: T) => string = () => 'ok'
): T | null {
    try {
        const result = action();
        details.push(`${label}: ${formatResult(result)}`);
        return result;
    }
    catch (err) {
        details.push(`${label}: failed - ${getErrorMessage(err)}`);
        return null;
    }
}

function getErrorMessage(err: unknown) {
    return err instanceof Error ? err.message : String(err);
}

function maskPushToken(expoPushToken: string) {
    if (expoPushToken.length <= 32) {
        return expoPushToken;
    }

    return `${expoPushToken.slice(0, 24)}...${expoPushToken.slice(-8)}`;
}
