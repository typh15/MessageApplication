import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import type { Session } from '@/session/session-storage';

import {
    subscribeToPushTokenRefresh,
    syncPushNotificationRegistration,
} from './push-notification-registration';

export function usePushNotifications(session: Session | null) {
    const router = useRouter();

    useEffect(() => {
        if (Platform.OS === 'web') {
            return;
        }

        const responseSubscription =
            Notifications.addNotificationResponseReceivedListener((response) => {
                openNotificationDestination(response, router);
            });

        void Notifications.getLastNotificationResponseAsync()
            .then((response) => {
                if (response) {
                    openNotificationDestination(response, router);
                }
            })
            .catch((err) => {
                console.warn('Failed to read last notification response:', err);
            });

        return () => {
            responseSubscription.remove();
        };
    }, [router]);

    useEffect(() => {
        if (!session || Platform.OS === 'web') {
            return;
        }

        void syncPushNotificationRegistration(session).catch((err) => {
            console.warn('Failed to register push notifications:', err);
        });

        const tokenSubscription = subscribeToPushTokenRefresh(session);

        return () => {
            tokenSubscription.remove();
        };
    }, [session]);
}

function openNotificationDestination(
    response: Notifications.NotificationResponse,
    router: ReturnType<typeof useRouter>
) {
    const boardId = getStringDataValue(response.notification.request.content.data?.boardId);

    if (!boardId) {
        return;
    }

    router.push({
        pathname: '/Chat-Page',
        params: { boardId },
    });
}

function getStringDataValue(value: unknown) {
    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return value.toString();
    }

    return null;
}
