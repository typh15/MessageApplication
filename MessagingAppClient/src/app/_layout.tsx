import { useColorScheme} from 'react-native';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { usePushNotifications } from '@/plugins/push-notifications';
import { useSession } from '@/hooks/use-session';

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const { session } = useSession();

    usePushNotifications(session);

    return (
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="Login-Registration-Page" />
                    <Stack.Screen name="Homescreen-Board-Select-Page" />
                    <Stack.Screen name="Chat-Page" />
                    <Stack.Screen name="Board-Creation-Page" />
                    <Stack.Screen name="Board-Join-Requests-Page" />
                    <Stack.Screen name="Account-Page" />
                    <Stack.Screen name="privacy" />
                    <Stack.Screen name="account-deletion" />
                </Stack>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
