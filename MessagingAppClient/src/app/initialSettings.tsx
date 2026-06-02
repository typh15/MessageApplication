import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TabTwoScreen() {
  const [username, setUsername] = useState('');
  const [sendToUser, setSendToUser] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [uniqueId, setUniqueId] = useState('');

  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();

  const handleResetUniqueId = () => {
    setUniqueId('');
  };

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

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">Configuration</ThemedText>
        </ThemedView>

        <ThemedView style={styles.formContainer}>
          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>UserName</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.text }]}
              placeholderTextColor={theme.text + '80'}
              placeholder="Enter username"
              value={username}
              onChangeText={setUsername}
            />
          </ThemedView>

          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Send to User</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.text }]}
              placeholderTextColor={theme.text + '80'}
              placeholder="Enter target user"
              value={sendToUser}
              onChangeText={setSendToUser}
            />
          </ThemedView>

          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.label}>Server IP Address</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.text }]}
              placeholderTextColor={theme.text + '80'}
              placeholder="Enter server IP address"
              value={ipAddress}
              onChangeText={setIpAddress}
            />
          </ThemedView>

          <ThemedView style={styles.uniqueIdContainer}>
            <ThemedView style={styles.uniqueIdContent}>
              <ThemedText style={styles.label}>Unique ID</ThemedText>
              <ThemedText style={styles.uniqueIdValue}>{uniqueId || 'Not set'}</ThemedText>
            </ThemedView>
            <Pressable
              style={({ pressed }) => [styles.resetButton, pressed && styles.buttonPressed]}
              onPress={handleResetUniqueId}>
              <ThemedText style={styles.buttonText}>Reset</ThemedText>
            </Pressable>
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
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
  },
  titleContainer: {
    gap: Spacing.three,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  formContainer: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  inputGroup: {
    gap: Spacing.two,
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  uniqueIdContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#cccccc',
    marginTop: Spacing.two,
  },
  uniqueIdContent: {
    flex: 1,
    gap: Spacing.one,
  },
  uniqueIdValue: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  resetButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
