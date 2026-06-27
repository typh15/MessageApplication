import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import type { Session } from '@/session/session-storage';

import {
    loadPushNotificationsModuleAsync,
    subscribeToPushTokenRefresh,
    syncPushNotificationRegistration,
} from './push-notification-registration';
import { getPushNotificationAvailability } from './push-notification-mode';

type NotificationResponse = import('expo-notifications').NotificationResponse;
type NotificationSubscription = {
    remove: () => void;
};

export function usePushNotifications(session: Session | null) {
    const router = useRouter();

    useEffect(() => {
        if (!getPushNotificationAvailability().enabled) {
            return;
        }

        let responseSubscription: NotificationSubscription | null = null;
        let removed = false;

        void loadPushNotificationsModuleAsync()
            .then((Notifications) => {
                if (!Notifications || removed) {
                    return;
                }

                responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
                    openNotificationDestination(response, router);
                });

                return Notifications.getLastNotificationResponseAsync();
            })
            .then((response) => {
                if (response && !removed) {
                    openNotificationDestination(response, router);
                }
            })
            .catch((err) => {
                console.warn('Failed to start push notification response listener:', err);
            });

        return () => {
            removed = true;
            responseSubscription?.remove();
        };
    }, [router]);

    useEffect(() => {
        if (!session || !getPushNotificationAvailability().enabled) {
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
    response: NotificationResponse,
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
