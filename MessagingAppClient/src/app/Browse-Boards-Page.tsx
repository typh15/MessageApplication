import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as APIHandler from '@/APIHandlers/ApiHandlerHub';
import type { MessageBoard } from '@/APIHandlers/ApiHandlerHub';
import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';
import { Button } from '@/components/ui/generic-button';
import { BottomTabInset, ControlSize, MaxContentWidth, Radius, Spacing, type AppTheme } from '@/constants/theme';
import { useBoards } from '@/hooks/API/use-boards';
import { useTheme } from '@/hooks/use-theme';

const IS_WEB = Platform.OS === 'web';

export default function BrowseBoardsScreen() {
    const [joiningBoardId, setJoiningBoardId] = useState<number | null>(null);
    const [protectedBoard, setProtectedBoard] = useState<MessageBoard | null>(null);
    const [password, setPassword] = useState('');
    const [actionError, setActionError] = useState('');
    const router = useRouter();
    const styles = useBrowseBoardStyles();
    const theme = useTheme();
    const {
        data: boardsData,
        loading,
        error,
        refresh,
    } = useBoards();
    const boards = useMemo(
        () => (boardsData ?? []).filter((board) => board.visibleToPublic && !board.isMember),
        [boardsData]
    );
    const errorMessage = actionError || error?.message || '';

    const handleBack = () => {
        router.back();
    };

    const handleJoinPress = (board: MessageBoard) => {
        setActionError('');

        if (board.passwordProtected) {
            setProtectedBoard(board);
            setPassword('');
            return;
        }

        void joinBoard(board);
    };

    const handleClosePassword = () => {
        if (joiningBoardId !== null) {
            return;
        }

        setProtectedBoard(null);
        setPassword('');
    };

    const handleJoinProtectedBoard = () => {
        if (!protectedBoard || !password.trim()) {
            setActionError('Enter the board password to continue.');
            return;
        }

        void joinBoard(protectedBoard, password.trim());
    };

    const joinBoard = async (board: MessageBoard, boardPassword?: string) => {
        try {
            setJoiningBoardId(board.boardId);
            setActionError('');
            await APIHandler.joinMessageBoard(board.boardId, boardPassword);
            await refresh();
            setProtectedBoard(null);
            setPassword('');

            router.push({
                pathname: '../Chat-Page',
                params: { boardId: board.boardId.toString() },
            });
        }
        catch (joinError) {
            const message = joinError instanceof Error ? joinError.message : 'Failed to join board';
            setActionError(message);
            console.error('Join board error:', joinError);
        }
        finally {
            setJoiningBoardId(null);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                >
                    <ThemedView style={styles.content}>
                        <ThemedView style={styles.header}>
                            <ThemedView style={styles.titleBlock}>
                                <ThemedText type="title" style={styles.title}>
                                    Browse Boards
                                </ThemedText>
                                <ThemedText style={styles.subtitle}>
                                    Discover public boards you have not joined yet.
                                </ThemedText>
                            </ThemedView>

                            <Button
                                showText={true}
                                buttonText="Back"
                                onPress={handleBack}
                                style={styles.backButton}
                                textStyle={styles.buttonText}
                                borderWidth={1}
                                borderColor={theme.borderAccent}
                                backgroundColor={theme.buttonBackground}
                                borderRadius={Radius.sm}
                            />
                        </ThemedView>

                        {errorMessage ? (
                            <ThemedView style={styles.errorContainer}>
                                <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
                            </ThemedView>
                        ) : null}

                        <ThemedView style={styles.boardSection}>
                            <ThemedView style={styles.boardSectionHeader}>
                                <ThemedText type="subtitle" style={styles.sectionTitle}>
                                    Public boards
                                </ThemedText>
                                <ThemedText style={styles.sectionSubtitle}>
                                    {boards.length === 1 ? '1 board' : `${boards.length} boards`}
                                </ThemedText>
                            </ThemedView>

                            {loading && boards.length === 0 ? (
                                <EmptyState message="Loading boards..." />
                            ) : boards.length === 0 ? (
                                <EmptyState message="No new public boards to browse" />
                            ) : (
                                <ThemedView style={styles.boardsList}>
                                    {boards.map((board) => {
                                        const joining = joiningBoardId === board.boardId;

                                        return (
                                            <ThemedView key={board.boardId} style={styles.boardRow}>
                                                <ThemedView style={styles.boardInfo}>
                                                    <ThemedText
                                                        type="subtitle"
                                                        style={styles.boardName}
                                                        numberOfLines={1}
                                                    >
                                                        {board.boardName}
                                                    </ThemedText>

                                                    <ThemedView style={styles.boardMeta}>
                                                        <ThemedView style={styles.boardBadge}>
                                                            <ThemedText style={styles.badgeText}>
                                                                {board.passwordProtected ? 'Password protected' : 'Public'}
                                                            </ThemedText>
                                                        </ThemedView>
                                                    </ThemedView>
                                                </ThemedView>

                                                <Button
                                                    showText={true}
                                                    buttonText={joining ? 'Joining...' : 'Join'}
                                                    onPress={() => handleJoinPress(board)}
                                                    disabled={joiningBoardId !== null}
                                                    style={styles.joinButton}
                                                    textStyle={styles.buttonText}
                                                    backgroundColor={theme.actionPrimary}
                                                    borderRadius={Radius.sm}
                                                />
                                            </ThemedView>
                                        );
                                    })}
                                </ThemedView>
                            )}
                        </ThemedView>
                    </ThemedView>
                </ScrollView>

                <Modal
                    visible={!!protectedBoard}
                    transparent
                    animationType="fade"
                    onRequestClose={handleClosePassword}
                >
                    <ThemedView style={styles.modalOverlay}>
                        <Pressable
                            style={styles.modalBackdrop}
                            disabled={joiningBoardId !== null}
                            onPress={handleClosePassword}
                            accessibilityRole="button"
                            accessibilityLabel="Close password prompt"
                        />

                        <ThemedView style={styles.modalCard}>
                            <ThemedView style={styles.modalHeader}>
                                <ThemedText type="subtitle" style={styles.modalTitle}>
                                    Join {protectedBoard?.boardName}
                                </ThemedText>
                                <ThemedText style={styles.modalSubtitle}>
                                    Enter this board&apos;s password to join.
                                </ThemedText>
                            </ThemedView>

                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Board password"
                                placeholderTextColor={theme.inputPlaceholder}
                                secureTextEntry
                                editable={joiningBoardId === null}
                                onSubmitEditing={handleJoinProtectedBoard}
                                style={styles.modalInput}
                            />

                            {actionError ? (
                                <ThemedText style={styles.errorText}>{actionError}</ThemedText>
                            ) : null}

                            <ThemedView style={styles.modalActions}>
                                <Button
                                    showText={true}
                                    buttonText={joiningBoardId !== null ? 'Joining...' : 'Join board'}
                                    onPress={handleJoinProtectedBoard}
                                    disabled={joiningBoardId !== null || !password.trim()}
                                    style={styles.modalButton}
                                    textStyle={styles.buttonText}
                                    backgroundColor={theme.actionPrimary}
                                    borderRadius={Radius.sm}
                                />
                                <Button
                                    showText={true}
                                    buttonText="Cancel"
                                    onPress={handleClosePassword}
                                    disabled={joiningBoardId !== null}
                                    style={styles.modalButton}
                                    textStyle={styles.buttonText}
                                    backgroundColor={theme.buttonBackground}
                                    borderRadius={Radius.sm}
                                />
                            </ThemedView>
                        </ThemedView>
                    </ThemedView>
                </Modal>
            </SafeAreaView>
        </ThemedView>
    );
}

function EmptyState({ message }: { message: string }) {
    const styles = useBrowseBoardStyles();

    return (
        <ThemedView style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>{message}</ThemedText>
        </ThemedView>
    );
}

function useBrowseBoardStyles() {
    const theme = useTheme();

    return useMemo(() => createBrowseBoardStyles(theme), [theme]);
}

function createBrowseBoardStyles(theme: AppTheme) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },
        safeArea: {
            flex: 1,
        },
        scroll: {
            flex: 1,
        },
        scrollContent: {
            flexGrow: 1,
            paddingHorizontal: Spacing.four,
            paddingTop: IS_WEB ? Spacing.six : Spacing.three,
            paddingBottom: BottomTabInset + Spacing.four,
        },
        content: {
            width: '100%',
            maxWidth: MaxContentWidth,
            alignSelf: 'center',
            gap: Spacing.four,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: Spacing.three,
        },
        titleBlock: {
            flex: 1,
            minWidth: 220,
            gap: Spacing.half,
        },
        title: {
            fontSize: 34,
            lineHeight: 42,
            fontWeight: '700',
        },
        subtitle: {
            color: theme.textSecondary,
            fontSize: 15,
            lineHeight: 22,
        },
        backButton: {
            minHeight: ControlSize.md,
            paddingHorizontal: Spacing.three,
            paddingVertical: Spacing.two,
        },
        boardSection: {
            gap: Spacing.three,
        },
        boardSectionHeader: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: Spacing.two,
        },
        sectionTitle: {
            fontSize: 22,
            lineHeight: 28,
            fontWeight: '700',
        },
        sectionSubtitle: {
            color: theme.textSecondary,
            fontSize: 13,
            lineHeight: 18,
        },
        boardsList: {
            gap: Spacing.two,
        },
        boardRow: {
            minHeight: 76,
            borderWidth: 1,
            borderColor: theme.borderSubtle,
            borderRadius: Radius.sm,
            padding: Spacing.three,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: Spacing.three,
            backgroundColor: theme.surfacePreview,
        },
        boardInfo: {
            flex: 1,
            minWidth: 0,
            gap: Spacing.two,
            backgroundColor: theme.surfacePreview,
        },
        boardName: {
            fontSize: 17,
            lineHeight: 22,
            fontWeight: '700',
        },
        boardMeta: {
            flexDirection: 'row',
            backgroundColor: theme.surfacePreview,
        },
        boardBadge: {
            alignSelf: 'flex-start',
            borderWidth: 1,
            borderColor: theme.borderSubtle,
            borderRadius: Radius.round,
            paddingHorizontal: Spacing.two,
            paddingVertical: Spacing.half,
            backgroundColor: theme.surfaceInput,
        },
        badgeText: {
            color: theme.textSecondary,
            fontSize: 12,
            lineHeight: 16,
            fontWeight: '700',
        },
        joinButton: {
            minWidth: 92,
            minHeight: 40,
            paddingHorizontal: Spacing.three,
            paddingVertical: Spacing.two,
        },
        buttonText: {
            color: theme.textOnAccent,
            fontSize: 14,
            lineHeight: 18,
            fontWeight: '700',
        },
        errorContainer: {
            borderWidth: 1,
            borderColor: theme.actionDanger,
            borderRadius: Radius.sm,
            padding: Spacing.three,
            backgroundColor: theme.dangerSurface,
        },
        errorText: {
            color: theme.dangerText,
            fontSize: 14,
            lineHeight: 20,
        },
        emptyContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 160,
            borderWidth: 1,
            borderColor: theme.borderSubtle,
            borderRadius: Radius.sm,
            padding: Spacing.four,
            backgroundColor: theme.surfacePreview,
        },
        emptyText: {
            color: theme.textSecondary,
            fontSize: 16,
            lineHeight: 22,
            textAlign: 'center',
        },
        modalOverlay: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: Spacing.four,
            backgroundColor: theme.surfaceOverlay,
        },
        modalBackdrop: {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        },
        modalCard: {
            width: '100%',
            maxWidth: 440,
            borderWidth: 1,
            borderColor: theme.borderOverlay,
            borderRadius: Radius.sm,
            padding: Spacing.four,
            gap: Spacing.three,
            backgroundColor: theme.surfaceRaised,
        },
        modalHeader: {
            gap: Spacing.half,
            backgroundColor: theme.surfaceRaised,
        },
        modalTitle: {
            fontSize: 22,
            lineHeight: 28,
            fontWeight: '700',
        },
        modalSubtitle: {
            color: theme.textSecondary,
            fontSize: 14,
            lineHeight: 20,
        },
        modalInput: {
            minHeight: ControlSize.lg,
            borderWidth: 1,
            borderColor: theme.borderAccent,
            borderRadius: Radius.sm,
            paddingHorizontal: Spacing.three,
            paddingVertical: Spacing.two,
            backgroundColor: theme.surfaceInput,
            color: theme.text,
            fontSize: 16,
        },
        modalActions: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: Spacing.two,
            backgroundColor: theme.surfaceRaised,
        },
        modalButton: {
            minHeight: 42,
            paddingHorizontal: Spacing.three,
            paddingVertical: Spacing.two,
        },
    });
}
