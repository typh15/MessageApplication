import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as APIHandler from '@/ApiHandler';

export default function RegistrationScreen() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleRegister = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await APIHandler.createActiveUser(username);
      console.log('User registered:', response);
      
      // Store username locally
      await AsyncStorage.setItem('username', username);
      
      // Navigate to the boards selection screen
      router.push('../boards');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register';
      setError(errorMessage);
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearUniqueId = async () => {
    try {
      await AsyncStorage.removeItem('uniqueid');
      setUsername('');
      setError('');
      console.log('UniqueId cleared');
    } catch (err) {
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
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to login');
    } finally {
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
          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Username</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.text }]}
              placeholderTextColor={theme.text + '80'}
              placeholder="Enter your username"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                setError('');
              }}
              editable={!loading}
            />
          </ThemedView>

          {error ? (
            <ThemedView style={[styles.errorContainer, { borderColor: '#ff4444' }]}>
              <ThemedText style={{ color: '#ff4444' }}>{error}</ThemedText>
            </ThemedView>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.registerButton,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleRegister}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <ThemedText style={styles.buttonText}>Register</ThemedText>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            onPress={handleLogin}
            disabled={loading}
          >
            <ThemedText style={[styles.buttonText, { opacity: 0.9 }]}>Login</ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            onPress={handleClearUniqueId}>
            <ThemedText style={[styles.buttonText, { opacity: 0.7 }]}>Clear Saved ID</ThemedText>
          </Pressable>
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

