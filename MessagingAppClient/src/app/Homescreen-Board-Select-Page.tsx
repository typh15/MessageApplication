import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useBoards } from '@/hooks/API/use-boards';
import { useTheme } from '@/hooks/use-theme';
import type { MessageBoard } from '@/APIHandlers/ApiHandlerHub';
import * as APIHandler from '@/APIHandlers/ApiHandlerHub';

import { Button } from '@/components/ui/generic-button';

type HomeOverlay =
    | 'new-board'
    | 'request-access'
    | 'invites'
    | 'profile'
    | 'user-search';

export default function BoardSelectionScreen() {
    const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
    const [joining, setJoining] = useState(false);
    const [searchBoardId, setSearchBoardId] = useState('');
    const [requestingJoin, setRequestingJoin] = useState(false);
    const [actionError, setActionError] = useState('');
    const [activeOverlay, setActiveOverlay] = useState<HomeOverlay | null>(null);
    const router = useRouter();

    const {
        data: boardsData,
        error: boardsError,
        refresh: refreshBoards,
    } = useBoards();
    const boards = boardsData ?? [];
    const errorMessage = actionError || boardsError?.message || '';

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

    const handleRequestBoardByUniqueId = async () => {
        if (!searchBoardId.trim()) {
            Alert.alert('Enter board ID', 'Please enter the unique board ID to request access.');
            return;
        }

        try {
            setRequestingJoin(true);
            setActionError('');
            await APIHandler.requestBoardMembership(searchBoardId.trim());
            Alert.alert('Request sent', 'Your request to join the board has been submitted.');
            setSearchBoardId('');
            await refreshBoards();
        } 
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to request board access';
            setActionError(errorMessage);
            console.error('Request board join error:', err);
            Alert.alert('Error', errorMessage);
        } 
        finally {
            setRequestingJoin(false);
        }
    };

    const handleJoinBoard = async (boardId: number) => {
        try {
            setJoining(true);
            setSelectedBoardId(boardId);
            setActionError('');
            await APIHandler.joinMessageBoard(boardId);
            console.log('Joined board:', boardId);

            router.push({
                pathname: '../Chat-Page',
                params: { boardId: boardId.toString() },
            });
        } 
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to join board';
            setActionError(errorMessage);
            console.error('Join board error:', err);
        } 
        finally {
            setJoining(false);
            setSelectedBoardId(null);
        }
    };
/*
    const HomescreenOverlay = () => (
        <ThemedView style={[styles.boardCard, { borderColor: theme.text + '90' }]}>
            <ThemedView style={styles.boardInfo}>
                <ThemedText type="subtitle" style={styles.boardName}>
                    {board.boardName}
                </ThemedText>

                <ThemedView style={styles.boardMeta}>
                    {board.visibleToPublic && 
                    (
                        <ThemedText style={styles.badgeText}>Public</ThemedText>
                    )}

                {board.passwordProtected && (
                    <ThemedText style={styles.badgeText}>Protected</ThemedText>
                )}
                </ThemedView>
            </ThemedView>


            <Button
                showText={true}
                buttonText="New Board"
                onPress={() => router.push('/Board-Creation-Page')}
                style={styles.newBoardButton}
                textStyle={styles.newBoardButtonText}
            />
        </ThemedView>
    );

*/
    const renderBoardCard = (board: MessageBoard) => (
        <ThemedView style={[styles.boardCard, { borderColor: theme.text + '90' }]}>
        <ThemedView style={styles.boardInfo}>
            <ThemedText type="subtitle" style={styles.boardName}>
                {board.boardName}
            </ThemedText>

            <ThemedView style={styles.boardMeta}>
            {board.visibleToPublic && (
                <ThemedText style={styles.badgeText}>Public</ThemedText>
            )}

            {board.passwordProtected && (
                <ThemedText style={styles.badgeText}>Protected</ThemedText>
            )}
            </ThemedView>
        </ThemedView>

        <Button
            showText={true}
            buttonText="Join"
            onPress={() => handleJoinBoard(board.boardId)}
            disabled={joining && selectedBoardId === board.boardId}
            style={styles.joinButton}
            textStyle={styles.joinButtonText}
        />
        </ThemedView>
    );

    return (
        <ThemedView style={styles.container}>
        <ScrollView
            contentInset={insets}
            contentContainerStyle={contentPlatformStyle}
            scrollEnabled={boards.length > 3}>
            <ThemedView style={styles.headerContainer}>
            <ThemedView style={styles.headerTop}>
                <ThemedText type="title">Message Boards</ThemedText>

                <Button
                showText={true}
                buttonText="New Board"
                onPress={() => router.push('/Board-Creation-Page')}
                style={styles.newBoardButton}
                textStyle={styles.newBoardButtonText}
                />
            </ThemedView>

            <ThemedText type="subtitle" style={styles.subtitle}>
                Select a board to join
            </ThemedText>

            <ThemedView style={styles.requestSection}>
                <ThemedText style={styles.requestLabel}>Request access to a private board</ThemedText>
                <TextInput
                value={searchBoardId}
                onChangeText={setSearchBoardId}
                placeholder="Enter unique board ID"
                placeholderTextColor="#8E95A8"
                style={styles.searchInput}
                autoCapitalize="none"
                />
                <Button
                showText={true}
                buttonText={requestingJoin ? 'Requesting...' : 'Request Access'}
                onPress={handleRequestBoardByUniqueId}
                disabled={requestingJoin}
                style={styles.requestButton}
                textStyle={styles.requestButtonText}
                />
                <ThemedText style={styles.requestHint}>
                Use the unique board ID for private boards only.
                </ThemedText>
            </ThemedView>
            </ThemedView>

            {errorMessage ? (
            <ThemedView style={[styles.errorContainer, { borderColor: '#ff4444' }]}>
                <ThemedText style={{ color: '#ff4444' }}>{errorMessage}</ThemedText>

                <Button
                showText={true}
                buttonText="New Board"
                onPress={() => router.push('/Board-Creation-Page')}
                style={styles.retryButton}
                textStyle={styles.buttonText}
                />
            </ThemedView>
            ) : null}

            {boards.length === 0 ? (
            <ThemedView style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>No boards available</ThemedText>
            </ThemedView>
            ) : (
            <ThemedView style={styles.boardsList}>
                {boards.map((board) => (
                <ThemedView key={board.boardId} style={styles.boardCardWrapper}>
                    {renderBoardCard(board)}
                </ThemedView>
                ))}
            </ThemedView>
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
        gap: Spacing.three,
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
        gap: Spacing.two,
        width: '98%',
    },
    boardCard: {
        borderWidth: 4,
        borderRadius: 12,
        padding: Spacing.three,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.three,
        borderColor: '#feffff',
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
    requestSection: {
        marginTop: Spacing.four,
        gap: Spacing.two,
    },
    requestLabel: {
        fontSize: 14,
        opacity: 0.8,
    },
    searchInput: {
        backgroundColor: '#1c1c1e',
        borderColor: '#444',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        color: '#ffffff',
    },
    requestButton: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.two,
        alignSelf: 'flex-start',
    },
    requestButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    requestHint: {
        fontSize: 12,
        opacity: 0.7,
        marginTop: Spacing.one,
    },
    boardCardWrapper: {
        marginBottom: Spacing.three,
    },
});
