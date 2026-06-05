import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as APIHandler from '@/ApiHandler';

export interface MessageBoard {
    boardId: number;
    boardName: string;
    visibleToPublic: boolean;
    passwordProtected: boolean;
}

export default function BoardSelectionScreen() {
    const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
    const [joining, setJoining] = useState(false);
    const [boards, setBoards] = useState<MessageBoard[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    
    // Poll for new boards at a fixed interval
    useEffect(() => {
        const intervalId = setInterval(() => {
            loadBoards(false);
        }, 5000);

        return () => clearInterval(intervalId);
    }, []);


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

  useEffect(() => {
   
    loadBoards(true);
  }, []);

const loadBoards = async (showFullScreenLoading: boolean = false) => {
  try {
    if (showFullScreenLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError('');

    const boardsData = await APIHandler.getMessageBoards();
    setBoards(boardsData);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load boards';
    setError(errorMessage);
    console.error('Load boards error:', err);
  } finally {
    if (showFullScreenLoading) {
      setLoading(false);
    } else {
      setRefreshing(false);
    }
  }
};

  const handleJoinBoard = async (boardId: number) => {
    try {
      setJoining(true);
      setSelectedBoardId(boardId);
      await APIHandler.joinMessageBoard(boardId);
      console.log('Joined board:', boardId);
      
      // Navigate to the chat screen with the selected board
      router.push({
        pathname: '../chat',
        params: { boardId: boardId.toString() }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join board';
      setError(errorMessage);
      console.error('Join board error:', err);
    } finally {
      setJoining(false);
      setSelectedBoardId(null);
    }
  };

  const renderBoardCard = ({ item }: { item: MessageBoard }) => (
    <ThemedView style={[styles.boardCard, { borderColor: theme.text + '40' }]}>
      <ThemedView style={styles.boardInfo}>
        <ThemedText type="subtitle" style={styles.boardName}>
          {item.boardName}
        </ThemedText>
        <ThemedView style={styles.boardMeta}>
          {item.visibleToPublic && (
            <ThemedText style={styles.badgeText}>Public</ThemedText>
          )}
          {item.passwordProtected && (
            <ThemedText style={styles.badgeText}>Protected</ThemedText>
          )}
        </ThemedView>
      </ThemedView>
      <Pressable
        style={({ pressed }) => [
          styles.joinButton,
          pressed && styles.buttonPressed,
          (joining && selectedBoardId === item.boardId) && styles.buttonDisabled,
        ]}
        onPress={() => handleJoinBoard(item.boardId)}
        disabled={joining && selectedBoardId === item.boardId}>
        {joining && selectedBoardId === item.boardId ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <ThemedText style={styles.joinButtonText}>Join</ThemedText>
        )}
      </Pressable>
    </ThemedView>
  );

  if (loading) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
        <ThemedText style={{ marginTop: Spacing.three }}>Loading boards...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentInset={insets}
        contentContainerStyle={contentPlatformStyle}
        scrollEnabled={boards.length > 3}>
        <ThemedView style={styles.headerContainer}>
          <ThemedView style={styles.headerTop}>
            <ThemedText type="title">Message Boards</ThemedText>
            <Pressable
              style={({ pressed }) => [styles.newBoardButton, pressed && styles.buttonPressed]}
              onPress={() => router.push('../new-board')}
            >
              <ThemedText style={styles.newBoardButtonText}>New Board</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedText type="subtitle" style={styles.subtitle}>
            Select a board to join
          </ThemedText>
        </ThemedView>

        {error ? (
          <ThemedView style={[styles.errorContainer, { borderColor: '#ff4444' }]}>
            <ThemedText style={{ color: '#ff4444' }}>{error}</ThemedText>
            <Pressable
              style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
              onPress={() => loadBoards(true)}>
              <ThemedText style={[styles.buttonText, { fontSize: 14 }]}>Retry</ThemedText>
            </Pressable>
          </ThemedView>
        ) : null}

        {boards.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>No boards available</ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={boards}
            renderItem={renderBoardCard}
            keyExtractor={(item) => item.boardId.toString()}
            scrollEnabled={false}
            style={styles.boardsList}
            contentContainerStyle={{ gap: Spacing.three }}
          />
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
  },
  headerContainer: {
    marginBottom: Spacing.six,
  },
  headerTop: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  newBoardButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
  newBoardButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: Spacing.two,
    opacity: 0.8,
  },
  boardsList: {
    flex: 1,
  },
  boardCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.four,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  boardInfo: {
    flex: 1,
    gap: Spacing.two,
  },
  boardName: {
    fontSize: 18,
    fontWeight: '600',
  },
  boardMeta: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  badgeText: {
    fontSize: 12,
    opacity: 0.7,
  },
  joinButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
});
