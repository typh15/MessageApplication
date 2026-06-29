import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type PushNotificationMode = 'auto' | 'enabled' | 'disabled';

export type PushNotificationAvailability = {
    enabled: boolean;
    reason?: string;
};

type ExpoExtraWithPushNotifications = {
    pushNotifications?: {
        diagnostics?: boolean | string;
        mode?: string;
    };
};

export function getPushNotificationMode(): PushNotificationMode {
    const extra = Constants.expoConfig?.extra as ExpoExtraWithPushNotifications | undefined;
    const configuredMode = extra?.pushNotifications?.mode?.trim().toLowerCase();

    if (configuredMode === 'enabled' || configuredMode === 'disabled') {
        return configuredMode;
    }

    return 'auto';
}

export function getPushNotificationAvailability(): PushNotificationAvailability {
    const mode = getPushNotificationMode();

    if (mode === 'disabled') {
        return {
            enabled: false,
            reason: 'Push notifications are disabled by app config.',
        };
    }

    if (Platform.OS === 'web') {
        return {
            enabled: false,
            reason: 'Push notifications are only registered on native devices.',
        };
    }

    if (isExpoGo()) {
        return {
            enabled: false,
            reason: 'Push notifications are disabled in Expo Go.',
        };
    }

    return { enabled: true };
}

export function isExpoGo() {
    return Constants.appOwnership === 'expo';
}

export function getPushNotificationRuntimeDetails() {
    return [
        `Platform: ${Platform.OS}`,
        `App ownership: ${Constants.appOwnership ?? 'none'}`,
        `Execution environment: ${Constants.executionEnvironment ?? 'unknown'}`,
        `Expo Go config present: ${Constants.expoGoConfig == null ? 'no' : 'yes'}`,
    ];
}

export function shouldShowPushNotificationDiagnostics() {
    const extra = Constants.expoConfig?.extra as ExpoExtraWithPushNotifications | undefined;
    const configuredDiagnostics = extra?.pushNotifications?.diagnostics;

    if (typeof configuredDiagnostics === 'boolean') {
        return configuredDiagnostics;
    }

    if (typeof configuredDiagnostics === 'string') {
        const normalizedValue = configuredDiagnostics.trim().toLowerCase();

        if (['enabled', 'true', 'on'].includes(normalizedValue)) {
            return true;
        }

        if (['disabled', 'false', 'off'].includes(normalizedValue)) {
            return false;
        }
    }

    return __DEV__;
}
