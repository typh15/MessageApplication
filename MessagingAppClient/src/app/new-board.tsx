import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, Switch, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as APIHandler from '@/ApiHandler';
import { Button } from '@/components/ui/Button';
import { LabeledTextBox } from '@/components/ui/LabeledTextBox';

export default function NewBoardScreen() {
  const [boardName, setBoardName] = useState('');
  const [visibleToPublic, setVisibleToPublic] = useState(true);
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();

  const handleCreate = async () => {
    if (!boardName.trim()) {
      Alert.alert('Validation', 'Please enter a board name');
      return;
    }

    if (passwordProtected && !password) {
      Alert.alert('Validation', 'Please enter a password for the protected board');
      return;
    }

    try {
      setLoading(true);
      await APIHandler.createMessageBoard(boardName.trim(), visibleToPublic, passwordProtected, password ?? '');
      // go back to boards and let it refresh
      router.replace('../boards');
    } catch (err) {
      console.error('Create board error:', err);
      Alert.alert('Error', 'Failed to create board');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={{ padding: Spacing.four }}>
      <ThemedView style={{ gap: Spacing.four }}>
        <ThemedText type="title">Create Message Board</ThemedText>
        
            <LabeledTextBox
                labelText="Board Name"
                placeholder="Enter board name"
                value={boardName}
                onChangeText={setBoardName}
                editable={!loading}
            />

        <ThemedView style={styles.row}>
          <ThemedText style={styles.label}>Visible To Public</ThemedText>
          <Switch value={visibleToPublic} onValueChange={setVisibleToPublic} />
        </ThemedView>

        <ThemedView style={styles.row}>
          <ThemedText style={styles.label}>Password Protected</ThemedText>
          <Switch value={passwordProtected} onValueChange={setPasswordProtected} />
        </ThemedView>

        {passwordProtected && (
          <ThemedView>
        
            <LabeledTextBox
                labelText="Password"
                placeholder="Enter password"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                password = {true}
             />      
             
          </ThemedView>
        )}
                    
        <Button
            showText={true}
            buttonText="Create Board"
            disabled={loading}
            onPress={handleCreate}
            style={styles.createButton}
            textStyle={styles.buttonText}
        />

      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
    fontSize: 16,
    minHeight: 48,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: Spacing.three,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: { opacity: 0.7 },
  buttonDisabled: { opacity: 0.6 },
});
