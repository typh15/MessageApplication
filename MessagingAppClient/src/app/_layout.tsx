import { useColorScheme, ActivityIndicator} from 'react-native';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';

export default function RootLayout() {
    const colorScheme = useColorScheme();

    return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="registration" />
                <Stack.Screen name="boards" />
                <Stack.Screen name="chat" />
            </Stack>
        </ThemeProvider>
    );
}