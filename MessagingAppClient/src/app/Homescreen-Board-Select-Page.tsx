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

export default function BoardSelectionScreen() {
    const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
    const [joining, setJoining] = useState(false);
    const [joinBoardId, setJoinBoardId] = useState('');
    const [joinPassword, setJoinPassword] = useState('');
    const [joiningByCode, setJoiningByCode] = useState(false);
    const [actionError, setActionError] = useState('');
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

    const handleJoinProtectedBoard = async () => {
        const uniqueBoardId = joinBoardId.trim();
        const password = joinPassword.trim();

        if (!uniqueBoardId) {
            Alert.alert('Enter board ID', 'Please enter the unique board ID.');
            return;
        }

        if (!password) {
            Alert.alert('Enter password', 'Please enter the board password.');
            return;
        }

        try {
            setJoiningByCode(true);
            setActionError('');
            await APIHandler.joinBoardByCode(uniqueBoardId, password);

            const updatedBoards = await refreshBoards();
            const joinedBoard = updatedBoards?.find(
                (board) => board.uniqueBoardId?.toLowerCase() === uniqueBoardId.toLowerCase()
            );

            setJoinBoardId('');
            setJoinPassword('');

            if (joinedBoard) {
                router.push({
                    pathname: '../Chat-Page',
                    params: { boardId: joinedBoard.boardId.toString() },
                });
                return;
            }

            Alert.alert('Joined board', 'The board was added to your list.');
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to join board';
            setActionError(errorMessage);
            console.error('Join protected board error:', err);
            Alert.alert('Error', errorMessage);
        }
        finally {
            setJoiningByCode(false);
        }
    };

    const handleJoinBoard = async (boardId: number) => {
        try {
            setJoining(true);
            setSelectedBoardId(boardId);
            setActionError('');
            await APIHandler.joinMessageBoard(boardId);

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

    const renderBoardCard = (board: MessageBoard) => (
        <ThemedView style={[styles.boardCard, { borderColor: theme.text + '90' }]}>
            <ThemedView style={styles.boardInfo}>
                <ThemedText type="subtitle" style={styles.boardName}>
                    {board.boardName}
                </ThemedText>

                <ThemedView style={styles.boardMeta}>
                    {board.visibleToPublic ? (
                        <ThemedText style={styles.badgeText}>Public</ThemedText>
                    ) : (
                        <ThemedText style={styles.badgeText}>Private</ThemedText>
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
                contentContainerStyle={contentPlatformStyle}>
                <ThemedView style={styles.headerContainer}>
                    <ThemedView style={styles.headerTop}>
                        <ThemedText type="title">Message Boards</ThemedText>

                        <ThemedView style={styles.headerActions}>
                            <Button
                                showText={true}
                                buttonText="Account"
                                onPress={() => router.push('../Account-Page')}
                                style={styles.secondaryHeaderButton}
                                textStyle={styles.secondaryHeaderButtonText}
                            />

                            <Button
                                showText={true}
                                buttonText="New Board"
                                onPress={() => router.push('/Board-Creation-Page')}
                                style={styles.newBoardButton}
                                textStyle={styles.newBoardButtonText}
                            />
                        </ThemedView>
                    </ThemedView>

                    <ThemedText type="subtitle" style={styles.subtitle}>
                        Select a board to join
                    </ThemedText>

                    <ThemedView style={styles.privateAccessGrid}>
                        <ThemedView style={[styles.accessSection, { borderColor: theme.genericborder }]}>
                            <ThemedText style={styles.requestLabel}>Join a private board</ThemedText>
                            <TextInput
                                value={joinBoardId}
                                onChangeText={setJoinBoardId}
                                placeholder="Unique board ID"
                                placeholderTextColor="#8E95A8"
                                style={styles.searchInput}
                                autoCapitalize="none"
                                editable={!joiningByCode}
                            />
                            <TextInput
                                value={joinPassword}
                                onChangeText={setJoinPassword}
                                placeholder="Board password"
                                placeholderTextColor="#8E95A8"
                                style={styles.searchInput}
                                autoCapitalize="none"
                                secureTextEntry
                                editable={!joiningByCode}
                            />
                            <Button
                                showText={true}
                                buttonText={joiningByCode ? 'Joining...' : 'Join With Password'}
                                onPress={handleJoinProtectedBoard}
                                disabled={joiningByCode}
                                style={styles.requestButton}
                                textStyle={styles.requestButtonText}
                            />
                            <ThemedText style={styles.requestHint}>
                                Use this when the board owner shared both the board ID and password.
                            </ThemedText>
                        </ThemedView>

                    </ThemedView>
                </ThemedView>

                {errorMessage ? (
                    <ThemedView style={[styles.errorContainer, { borderColor: '#ff4444' }]}>
                        <ThemedText style={{ color: '#ff4444' }}>{errorMessage}</ThemedText>
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
    headerActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: Spacing.two,
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
    secondaryHeaderButton: {
        backgroundColor: '#303342',
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        borderRadius: 8,
    },
    secondaryHeaderButtonText: {
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
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.six,
    },
    emptyText: {
        fontSize: 16,
        opacity: 0.6,
    },
    privateAccessGrid: {
        marginTop: Spacing.four,
        gap: Spacing.three,
    },
    accessSection: {
        borderWidth: 1,
        borderRadius: 8,
        padding: Spacing.three,
        gap: Spacing.two,
        backgroundColor: '#11131A',
    },
    requestLabel: {
        fontSize: 14,
        fontWeight: '700',
        opacity: 0.9,
    },
    searchInput: {
        backgroundColor: '#1c1c1e',
        borderColor: '#444',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        color: '#ffffff',
        minHeight: 48,
    },
    requestButton: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.two,
        alignSelf: 'flex-start',
        minHeight: 40,
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
