import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as APIHandler from '@/ApiHandler';

import { Button } from '@/components/ui/Button';
import { LabeledTextBox } from '@/components/ui/LabeledTextBox';

export default function RegistrationScreen() {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [serverUrl, setServerUrl] = useState('');
    const [activeUserNames, setActiveUserNames] = useState<string[]>([]);
    const router = useRouter();

    const loadServerUrl = async () => {
        try {      const url = await AsyncStorage.getItem('serverUrl');
        if (url) {
            setServerUrl(url);
        }
        } catch (err) { 
            console.error('Failed to load server URL:', err);
        }
    }

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

    const GetActiveUserNames = async () => {
        try {
            const names = await APIHandler.GetAllActiveUserNames();
            console.log('Active usernames:', names);
            setActiveUserNames(names);
        } 
        catch (err) {
            console.error('Failed to fetch active usernames:', err);
        }
    };

    useEffect(() => {
        // For testing: fetch active usernames on load
        GetActiveUserNames();
    }, []);

  
    
    // Poll for new boards at a fixed interval
    useEffect(() => {
        const intervalId = setInterval(() => {
            GetActiveUserNames();
        }, 10000);

        return () => clearInterval(intervalId);
    }, []);


    const handleRegister = async () => {
        if (!username.trim()) {
            setError('Please enter a username');
            return;
        }
        GetActiveUserNames();
        if (activeUserNames.includes(username)){
            setError('Username already exists');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const response = await APIHandler.createActiveUser(username);
            console.log('User registered:', response);
            
            // Store username and IP address locally
            await AsyncStorage.setItem('username', username);
            await AsyncStorage.setItem('serverUrl', serverUrl);
            
            // Navigate to the boards selection screen
            router.push('../boards');
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
            await AsyncStorage.removeItem('uniqueid');
            setUsername('');
            setError('');
            console.log('UniqueId cleared');
        } 
        catch (err) {
            console.error('Failed to clear uniqueid:', err);
        }
    };

    const handleLogin = async () => {
        try {
            setLoading(true);
            setError('');
            const uniqueId = await AsyncStorage.getItem('uniqueid');
            if (!uniqueId) {
                setError('No saved ID found. Please register first.');
                return;
            }

            // Proceed to boards — the app will use the saved uniqueId
            router.push('../boards');
        } 
        catch (err) {
            console.error('Login error:', err);
            setError('Failed to login');
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
                <ThemedText type="title">Create Your Username</ThemedText>
                <ThemedText type="subtitle" style={styles.subtitle}>
                    Enter a username to get started
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

            {error ? (
                <ThemedView style={[styles.errorContainer, { borderColor: '#ff4444' }]}>
                <ThemedText style={{ color: '#ff4444' }}>{error}</ThemedText>
                </ThemedView>
            ) : null}

                <Button
                    showText={true}
                    buttonText="Register"
                    onPress={handleRegister}
                    disabled={loading || username.trim().length === 0 || activeUserNames.includes(username)}
                    style={styles.buttonListStyle}
                    textStyle={styles.buttonText}
                />

                <Button
                    showText={true}
                    buttonText="Login"
                    onPress={handleLogin}
                    disabled={loading || username.trim().length === 0 || !activeUserNames.includes(username)}
                    style={styles.buttonListStyle}
                    textStyle={styles.buttonText}
                />

                <Button
                    showText={true}
                    buttonText="Clear Saved ID"
                    onPress={handleClearUniqueId}
                    disabled={loading || activeUserNames.length === 0}
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

