import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { DEFAULT_SERVER_URL, loadServerUrl, saveServerUrl } from '@/APIHandlers/Helpers/config';

import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { clearSession } from '@/hooks/use-session';
import * as APIHandler from '@/APIHandlers/ApiHandlerHub';

import { Button } from '@/components/ui/generic-button';
import { LabeledTextBox } from '@/components/ui/labeled-text-box';

const minimumPasswordLength = 8;

export default function RegistrationScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
    const [activeUserNames, setActiveUserNames] = useState<string[]>([]);
    const router = useRouter();

    const safeAreaInsets = useSafeAreaInsets();
    const insets = {
        ...safeAreaInsets,
        bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
    };
    const theme = useTheme();

    const contentPlatformStyle = Platform.select({
        android: {
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        paddingBottom: insets.bottom,
        },
        web: {
        paddingTop: Spacing.six,
        paddingBottom: Spacing.four,
        },
    });

    const getActiveUserNames = async () => {
        try {
            const names = await APIHandler.GetAllActiveUserNames();
            setActiveUserNames(names);
            return names;
        } 
        catch (err) {
            console.error('Failed to fetch active usernames:', err);
            return []
        }

    };

    useEffect(() => {
        loadServerUrl()
            .then(setServerUrl)
            .catch((err) => {
                console.error('Failed to load server URL:', err);
            });
    }, []);

    useEffect(() => {
        // For testing: fetch active usernames on load
        getActiveUserNames();
    }, []);

  
    
    // Poll for new boards at a fixed interval
    useEffect(() => {
        const intervalId = setInterval(() => {
            getActiveUserNames();
        }, 10000);

        return () => clearInterval(intervalId);
    }, []);


    const handleRegister = async () => {
        if (!username.trim()) {
            setError('Please enter a username');
            return;
        }
        const requestedUsername = username.trim();

        if (password.length < minimumPasswordLength) {
            setError(`Password must be at least ${minimumPasswordLength} characters`);
            return;
        }

        const names = await getActiveUserNames();

        const usernameExists = names.some(
            (name) => name.toLowerCase() === requestedUsername.toLowerCase()
        );

        if (usernameExists) {
            setError('Username already exists');
            return;
        }
        if (activeUserNames.some((name) => name.toLowerCase() === requestedUsername.toLowerCase())) {
            setError('Username already exists');
            return;
        }
        setLoading(true);
        setError('');

        try {
            await saveServerUrl(serverUrl);
            const response = await APIHandler.createActiveUser(requestedUsername, password);
            console.log('User registered:', response);

            // Navigate to the boards selection screen
            router.push('../Homescreen-Board-Select-Page');
        } 
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to register';
            setError(errorMessage);
            console.error('Registration error:', err);
        } 
        finally {
            setLoading(false);
        }
    };

    const handleClearUniqueId = async () => {
        try {
            await clearSession();
            setUsername('');
            setPassword('');
            setError('');
            console.log('UniqueId cleared');
        } 
        catch (err) {
            console.error('Failed to clear uniqueid:', err);
        }
    };

    const handleLogin = async () => {
        if (!username.trim()) {
            setError('Please enter a username');
            return;
        }

        if (!password) {
            setError('Please enter your password');
            return;
        }

        try {
            setLoading(true);
            setError('');
            await saveServerUrl(serverUrl);
            await APIHandler.loginUser(username.trim(), password);

            // Proceed to boards — the app will use the saved uniqueId
            router.push('../Homescreen-Board-Select-Page');
        } 
        catch (err) {
            console.error('Login error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Invalid username or password';
            setError(errorMessage);
        } 
        finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentInset={insets}
        contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
        <ThemedView style={styles.container}>
            <ThemedView style={styles.titleContainer}>
                <ThemedText type="title">Sign In</ThemedText>
                <ThemedText type="subtitle" style={styles.subtitle}>
                    Use your username and password to continue
                </ThemedText>
            </ThemedView>

            <ThemedView style={styles.formContainer}>
                
                <LabeledTextBox
                    labelText="Username"
                    placeholder="Enter your username..."
                    value={username}
                    onChangeText={(text) => {
                                    setUsername(text.trim());
                                    setError('');
                                }}
                    editable={!loading}
                />

                <LabeledTextBox
                    labelText="Password"
                    placeholder="Enter your password..."
                    value={password}
                    onChangeText={(text) => {
                        setPassword(text);
                        setError('');
                    }}
                    editable={!loading}
                    password={true}
                />

            {error ? (
                <ThemedView style={[styles.errorContainer, { borderColor: '#ff4444' }]}>
                <ThemedText style={{ color: '#ff4444' }}>{error}</ThemedText>
                </ThemedView>
            ) : null}

                <Button
                    showText={true}
                    buttonText="Register"
                    onPress={handleRegister}
                    disabled={
                        loading ||
                        username.trim().length === 0 ||
                        activeUserNames.some(
                            (name) => name.toLowerCase() === username.trim().toLowerCase()
                        )
                    }
                    style={styles.buttonListStyle}
                    textStyle={styles.buttonText}
                />

                <Button
                    showText={true}
                    buttonText="Login"
                    onPress={handleLogin}
                    disabled={loading || username.trim().length === 0 || password.length === 0}
                    style={styles.buttonListStyle}
                    textStyle={styles.buttonText}
                />

                <Button
                    showText={true}
                    buttonText="Clear Saved ID"
                    onPress={handleClearUniqueId}
                    disabled={loading}
                    style={styles.buttonListStyle}
                    textStyle={styles.buttonText}
                />

                <ThemedView style={styles.inputGroup}>
                    <ThemedText style={styles.label}>Server URL</ThemedText>
                    <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.text }]}
                    placeholderTextColor={theme.text + '80'}
                    placeholder="Enter server URL"
                    value={serverUrl}
                    onChangeText={setServerUrl}
                    />
                </ThemedView>
            
            </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    container: {
        flex: 1,
        padding: Spacing.four,
    },
    titleContainer: {
        marginBottom: Spacing.six,
        alignItems: 'center',
    },
    subtitle: {
        marginTop: Spacing.two,
        opacity: 0.8,
        textAlign: 'center',
    },
    formContainer: {
        gap: Spacing.four,
    },
    inputGroup: {
        gap: Spacing.two,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: Spacing.three,
        fontSize: 16,
        minHeight: 48,
    },
    errorContainer: {
        borderWidth: 1,
        borderRadius: 8,
        padding: Spacing.three,
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
    },
    registerButton: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        padding: Spacing.three,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.two,
    },
    buttonListStyle: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        padding: Spacing.three,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.two,
    },
    secondaryButton: {
        borderWidth: 1,
        borderColor: '#007AFF',
        borderRadius: 8,
        padding: Spacing.three,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonPressed: {
        opacity: 0.7,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});

