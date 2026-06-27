import { type ReactNode, useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';

import * as APIHandler from '@/APIHandlers/ApiHandlerHub';
import type { MessageBoard, PublicProfileResponse } from '@/APIHandlers/ApiHandlerHub';
import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';
import { Button } from '@/components/ui/generic-button';
import { BottomTabInset, ControlSize, MaxContentWidth, Radius, Spacing, type AppTheme } from '@/constants/theme';
import { useBoards } from '@/hooks/API/use-boards';
import { useTheme } from '@/hooks/use-theme';

const IS_WEB = Platform.OS === 'web';

export default function BoardSelectionScreen() {
    const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
    const [joining, setJoining] = useState(false);
    const [joinBoardId, setJoinBoardId] = useState('');
    const [joinPassword, setJoinPassword] = useState('');
    const [joiningByCode, setJoiningByCode] = useState(false);
    const [actionError, setActionError] = useState('');
    const [actionsMenuVisible, setActionsMenuVisible] = useState(false);
    const [privateJoinVisible, setPrivateJoinVisible] = useState(false);
    const [profileSearchVisible, setProfileSearchVisible] = useState(false);
    const [profileSearchUserName, setProfileSearchUserName] = useState('');
    const [profileSearchResult, setProfileSearchResult] = useState<PublicProfileResponse | null>(null);
    const [profileSearchError, setProfileSearchError] = useState('');
    const [searchingProfile, setSearchingProfile] = useState(false);
    const router = useRouter();
    const styles = useBoardSelectionStyles();

    const {
        data: boardsData,
        loading: boardsLoading,
        error: boardsError,
        refresh: refreshBoards,
    } = useBoards();
    const boards = boardsData ?? [];
    const errorMessage = actionError || boardsError?.message || '';

    const handleCreateBoard = () => {
        setActionsMenuVisible(false);
        router.push('/Board-Creation-Page');
    };

    const handleOpenAccount = () => {
        setActionsMenuVisible(false);
        router.push('../Account-Page');
    };

    const handleRefreshBoards = async () => {
        setActionsMenuVisible(false);
        setActionError('');
        await refreshBoards();
    };

    const handleOpenPrivateJoin = () => {
        setActionsMenuVisible(false);
        setActionError('');
        setPrivateJoinVisible(true);
    };

    const handleOpenProfileSearch = () => {
        setActionsMenuVisible(false);
        setProfileSearchVisible(true);
        setProfileSearchUserName('');
        setProfileSearchResult(null);
        setProfileSearchError('');
    };

    const handleClosePrivateJoin = () => {
        if (joiningByCode) {
            return;
        }

        setPrivateJoinVisible(false);
        setJoinBoardId('');
        setJoinPassword('');
        setActionError('');
    };

    const handleCloseProfileSearch = () => {
        if (searchingProfile) {
            return;
        }

        setProfileSearchVisible(false);
        setProfileSearchUserName('');
        setProfileSearchResult(null);
        setProfileSearchError('');
    };

    const handleSearchProfile = async () => {
        const userName = profileSearchUserName.trim();

        if (!userName) {
            Alert.alert('Enter username', 'Please enter a username to search.');
            return;
        }

        try {
            setSearchingProfile(true);
            setProfileSearchError('');
            setProfileSearchResult(null);

            const profile = await APIHandler.getPublicProfile(userName);

            if (!profile) {
                setProfileSearchError('No profile found for that username.');
                return;
            }

            setProfileSearchResult(profile);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to search profiles';
            setProfileSearchError(errorMessage);
            console.error('Search profile error:', err);
        }
        finally {
            setSearchingProfile(false);
        }
    };

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

            setPrivateJoinVisible(false);
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

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                >
                    <ThemedView style={styles.content}>
                        <BoardsHeader
                            actionsMenuVisible={actionsMenuVisible}
                            onToggleActionsMenu={() => setActionsMenuVisible(!actionsMenuVisible)}
                            onCreateBoard={handleCreateBoard}
                            onJoinPrivateBoard={handleOpenPrivateJoin}
                            onSearchProfiles={handleOpenProfileSearch}
                            onAccount={handleOpenAccount}
                            onRefreshBoards={handleRefreshBoards}
                        />

                        {errorMessage ? (
                            <ErrorBanner message={errorMessage} />
                        ) : null}

                        <BoardList
                            boards={boards}
                            loading={boardsLoading}
                            joining={joining}
                            selectedBoardId={selectedBoardId}
                            onJoinBoard={handleJoinBoard}
                        />
                    </ThemedView>
                </ScrollView>

                <JoinPrivateBoardModal
                    visible={privateJoinVisible}
                    joinBoardId={joinBoardId}
                    joinPassword={joinPassword}
                    joiningByCode={joiningByCode}
                    onChangeBoardId={setJoinBoardId}
                    onChangePassword={setJoinPassword}
                    onJoinBoard={handleJoinProtectedBoard}
                    onClose={handleClosePrivateJoin}
                />

                <UserProfileSearchModal
                    visible={profileSearchVisible}
                    userName={profileSearchUserName}
                    profile={profileSearchResult}
                    searching={searchingProfile}
                    errorMessage={profileSearchError}
                    onChangeUserName={setProfileSearchUserName}
                    onSearchProfile={handleSearchProfile}
                    onClose={handleCloseProfileSearch}
                />
            </SafeAreaView>
        </ThemedView>
    );
}

type BoardsHeaderProps = {
    actionsMenuVisible: boolean;
    onToggleActionsMenu: () => void;
    onCreateBoard: () => void;
    onJoinPrivateBoard: () => void;
    onSearchProfiles: () => void;
    onAccount: () => void;
    onRefreshBoards: () => void;
};

function BoardsHeader({
    actionsMenuVisible,
    onToggleActionsMenu,
    onCreateBoard,
    onJoinPrivateBoard,
    onSearchProfiles,
    onAccount,
    onRefreshBoards,
}: BoardsHeaderProps) {
    const theme = useTheme();
    const styles = useBoardSelectionStyles();

    return (
        <ThemedView style={styles.header}>
            <ThemedView style={styles.headerTop}>
                <ThemedView style={styles.titleBlock}>
                    <ThemedText type="title" style={styles.title}>
                        Boards
                    </ThemedText>
                    <ThemedText style={styles.subtitle}>
                        Choose a board or start something new.
                    </ThemedText>
                </ThemedView>

                <ThemedView style={styles.headerActionWrap}>
                    <Button
                        showText={true}
                        buttonText={actionsMenuVisible ? 'Close' : 'Actions'}
                        onPress={onToggleActionsMenu}
                        style={styles.actionsButton}
                        textStyle={styles.buttonText}
                        borderWidth={1}
                        borderColor={theme.borderAccent}
                        backgroundColor={theme.buttonBackground}
                        borderRadius={Radius.sm}
                    />

                    {actionsMenuVisible ? (
                        <BoardActionsMenu
                            onCreateBoard={onCreateBoard}
                            onJoinPrivateBoard={onJoinPrivateBoard}
                            onSearchProfiles={onSearchProfiles}
                            onAccount={onAccount}
                            onRefreshBoards={onRefreshBoards}
                        />
                    ) : null}
                </ThemedView>
            </ThemedView>
        </ThemedView>
    );
}

type BoardActionsMenuProps = {
    onCreateBoard: () => void;
    onJoinPrivateBoard: () => void;
    onSearchProfiles: () => void;
    onAccount: () => void;
    onRefreshBoards: () => void;
};

function BoardActionsMenu({
    onCreateBoard,
    onJoinPrivateBoard,
    onSearchProfiles,
    onAccount,
    onRefreshBoards,
}: BoardActionsMenuProps) {
    const styles = useBoardSelectionStyles();

    return (
        <ThemedView style={styles.actionMenu}>
            <ActionMenuItem label="Create board" onPress={onCreateBoard} />
            <ActionMenuItem label="Join private board" onPress={onJoinPrivateBoard} />
            <ActionMenuItem label="Search user profiles" onPress={onSearchProfiles} />
            <ActionMenuItem label="Account" onPress={onAccount} />
            <ActionMenuItem label="Refresh boards" onPress={onRefreshBoards} />
        </ThemedView>
    );
}

type ActionMenuItemProps = {
    label: string;
    onPress: () => void;
};

function ActionMenuItem({ label, onPress }: ActionMenuItemProps) {
    const styles = useBoardSelectionStyles();

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            style={({ pressed }) => [
                styles.actionMenuItem,
                pressed && styles.actionMenuItemPressed,
            ]}
        >
            <ThemedText style={styles.actionMenuItemText}>
                {label}
            </ThemedText>
        </Pressable>
    );
}

type ActionModalSize = 'default' | 'wide';

type ActionModalProps = {
    visible: boolean;
    title: string;
    subtitle: string;
    closeAccessibilityLabel: string;
    disabled?: boolean;
    size?: ActionModalSize;
    children: ReactNode;
    onClose: () => void;
};

function ActionModal({
    visible,
    title,
    subtitle,
    closeAccessibilityLabel,
    disabled = false,
    size = 'default',
    children,
    onClose,
}: ActionModalProps) {
    const styles = useBoardSelectionStyles();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Pressable
                    style={styles.modalBackdrop}
                    onPress={onClose}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={closeAccessibilityLabel}
                />

                <ThemedView style={[styles.modalCard, size === 'wide' && styles.modalCardWide]}>
                    <ThemedView style={styles.modalHeader}>
                        <ThemedText type="subtitle" style={styles.modalTitle}>
                            {title}
                        </ThemedText>
                        <ThemedText style={styles.modalSubtitle}>
                            {subtitle}
                        </ThemedText>
                    </ThemedView>

                    {children}
                </ThemedView>

                <ModalCloseButton
                    accessibilityLabel={closeAccessibilityLabel}
                    disabled={disabled}
                    onPress={onClose}
                />
            </View>
        </Modal>
    );
}

type ModalCloseButtonProps = {
    accessibilityLabel: string;
    disabled: boolean;
    onPress: () => void;
};

function ModalCloseButton({
    accessibilityLabel,
    disabled,
    onPress,
}: ModalCloseButtonProps) {
    const theme = useTheme();
    const styles = useBoardSelectionStyles();

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            style={({ pressed }) => [
                styles.modalCloseButton,
                pressed && styles.pressedControl,
                disabled && styles.disabledControl,
            ]}
        >
            <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                size={22}
                weight="bold"
                tintColor={theme.textOnAccent}
            />
        </Pressable>
    );
}

type ModalInputProps = {
    value: string;
    placeholder: string;
    editable: boolean;
    secureTextEntry?: boolean;
    onChangeText: (value: string) => void;
    onSubmitEditing?: () => void;
};

function ModalInput({
    value,
    placeholder,
    editable,
    secureTextEntry,
    onChangeText,
    onSubmitEditing,
}: ModalInputProps) {
    const theme = useTheme();
    const styles = useBoardSelectionStyles();

    return (
        <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.inputPlaceholder}
            style={styles.modalInput}
            autoCapitalize="none"
            editable={editable}
            secureTextEntry={secureTextEntry}
            onSubmitEditing={onSubmitEditing}
        />
    );
}

type ModalActionRowProps = {
    primaryText: string;
    primaryDisabled: boolean;
    secondaryDisabled: boolean;
    onPrimaryPress: () => void;
    onSecondaryPress: () => void;
};

function ModalActionRow({
    primaryText,
    primaryDisabled,
    secondaryDisabled,
    onPrimaryPress,
    onSecondaryPress,
}: ModalActionRowProps) {
    const theme = useTheme();
    const styles = useBoardSelectionStyles();

    return (
        <ThemedView style={styles.modalActions}>
            <Button
                showText={true}
                buttonText={primaryText}
                onPress={onPrimaryPress}
                disabled={primaryDisabled}
                style={styles.primaryButton}
                textStyle={styles.buttonText}
                backgroundColor={theme.actionPrimary}
                borderRadius={Radius.sm}
            />

            <Button
                showText={true}
                buttonText="Cancel"
                onPress={onSecondaryPress}
                disabled={secondaryDisabled}
                style={styles.secondaryButton}
                textStyle={styles.buttonText}
                backgroundColor={theme.actionDisabled}
                borderRadius={Radius.sm}
            />
        </ThemedView>
    );
}

type JoinPrivateBoardModalProps = {
    visible: boolean;
    joinBoardId: string;
    joinPassword: string;
    joiningByCode: boolean;
    onChangeBoardId: (value: string) => void;
    onChangePassword: (value: string) => void;
    onJoinBoard: () => void;
    onClose: () => void;
};

function JoinPrivateBoardModal({
    visible,
    joinBoardId,
    joinPassword,
    joiningByCode,
    onChangeBoardId,
    onChangePassword,
    onJoinBoard,
    onClose,
}: JoinPrivateBoardModalProps) {
    const styles = useBoardSelectionStyles();

    return (
        <ActionModal
            visible={visible}
            title="Join private board"
            subtitle="Enter the board ID and password from your invite."
            closeAccessibilityLabel="Close private board form"
            disabled={joiningByCode}
            onClose={onClose}
        >
            <ThemedView style={styles.modalForm}>
                <ModalInput
                    value={joinBoardId}
                    onChangeText={onChangeBoardId}
                    placeholder="Unique board ID"
                    editable={!joiningByCode}
                />

                <ModalInput
                    value={joinPassword}
                    onChangeText={onChangePassword}
                    placeholder="Board password"
                    editable={!joiningByCode}
                    secureTextEntry
                />

                <ModalActionRow
                    primaryText={joiningByCode ? 'Joining...' : 'Join board'}
                    primaryDisabled={joiningByCode}
                    secondaryDisabled={joiningByCode}
                    onPrimaryPress={onJoinBoard}
                    onSecondaryPress={onClose}
                />
            </ThemedView>
        </ActionModal>
    );
}

type UserProfileSearchModalProps = {
    visible: boolean;
    userName: string;
    profile: PublicProfileResponse | null;
    searching: boolean;
    errorMessage: string;
    onChangeUserName: (value: string) => void;
    onSearchProfile: () => void;
    onClose: () => void;
};

function UserProfileSearchModal({
    visible,
    userName,
    profile,
    searching,
    errorMessage,
    onChangeUserName,
    onSearchProfile,
    onClose,
}: UserProfileSearchModalProps) {
    const styles = useBoardSelectionStyles();

    return (
        <ActionModal
            visible={visible}
            title="Search user profiles"
            subtitle="Look up someone by username."
            closeAccessibilityLabel="Close profile search"
            disabled={searching}
            size="wide"
            onClose={onClose}
        >
            <ThemedView style={styles.modalForm}>
                <ModalInput
                    value={userName}
                    onChangeText={onChangeUserName}
                    placeholder="Username"
                    editable={!searching}
                    onSubmitEditing={onSearchProfile}
                />

                <ModalActionRow
                    primaryText={searching ? 'Searching...' : 'Search'}
                    primaryDisabled={searching}
                    secondaryDisabled={searching}
                    onPrimaryPress={onSearchProfile}
                    onSecondaryPress={onClose}
                />

                {errorMessage ? (
                    <ThemedText style={styles.profileSearchError}>
                        {errorMessage}
                    </ThemedText>
                ) : null}

                {profile ? (
                    <ProfileResultCard profile={profile} />
                ) : null}
            </ThemedView>
        </ActionModal>
    );
}

type ProfileResultCardProps = {
    profile: PublicProfileResponse;
};

function ProfileResultCard({ profile }: ProfileResultCardProps) {
    const styles = useBoardSelectionStyles();
    const avatarImageUrl = profile.avatarImageId ? APIHandler.getImageUrl(profile.avatarImageId) : null;
    const userName = profile.userName?.trim() || 'Unknown user';
    const uniqueId = profile.uniqueId?.trim() || 'Unknown';
    const displayName = profile.displayName?.trim() || userName;
    const avatarInitial = displayName.charAt(0).toUpperCase() || '?';

    return (
        <ThemedView style={styles.profileResultCard}>
            <ThemedView style={styles.profileAvatarFrame}>
                {avatarImageUrl ? (
                    <Image
                        source={{ uri: avatarImageUrl }}
                        style={styles.profileAvatarImage}
                        contentFit="cover"
                        transition={120}
                        accessibilityLabel="Profile picture"
                    />
                ) : (
                    <ThemedText style={styles.profileAvatarInitial}>{avatarInitial}</ThemedText>
                )}
            </ThemedView>

            <ThemedView style={styles.profileResultCopy}>
                <ThemedText style={styles.profileDisplayName} numberOfLines={1}>
                    {displayName}
                </ThemedText>
                <ThemedText style={styles.profileUserName} numberOfLines={1}>
                    Username: {userName}
                </ThemedText>
                <ThemedText style={styles.profileUserName} numberOfLines={1}>
                    ID: {uniqueId}
                </ThemedText>

                {profile.publicBlurb ? (
                    <ThemedText style={styles.profileBlurb}>
                        {profile.publicBlurb}
                    </ThemedText>
                ) : (
                    <ThemedText style={styles.profileBlurbEmpty}>
                        No public blurb yet.
                    </ThemedText>
                )}
            </ThemedView>
        </ThemedView>
    );
}

type BoardListProps = {
    boards: MessageBoard[];
    loading: boolean;
    joining: boolean;
    selectedBoardId: number | null;
    onJoinBoard: (boardId: number) => void;
};

function BoardList({
    boards,
    loading,
    joining,
    selectedBoardId,
    onJoinBoard,
}: BoardListProps) {
    const styles = useBoardSelectionStyles();

    return (
        <ThemedView style={styles.boardSection}>
            <ThemedView style={styles.boardSectionHeader}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                    Available boards
                </ThemedText>
                <ThemedText style={styles.sectionSubtitle}>
                    {boards.length === 1 ? '1 board' : `${boards.length} boards`}
                </ThemedText>
            </ThemedView>

            {loading && boards.length === 0 ? (
                <EmptyBoardsState message="Loading boards..." />
            ) : boards.length === 0 ? (
                <EmptyBoardsState message="No boards available" />
            ) : (
                <ThemedView style={styles.boardsList}>
                    {boards.map((board) => (
                        <BoardRow
                            key={board.boardId}
                            board={board}
                            joining={joining}
                            selectedBoardId={selectedBoardId}
                            onJoinBoard={onJoinBoard}
                        />
                    ))}
                </ThemedView>
            )}
        </ThemedView>
    );
}

type BoardRowProps = {
    board: MessageBoard;
    joining: boolean;
    selectedBoardId: number | null;
    onJoinBoard: (boardId: number) => void;
};

function BoardRow({
    board,
    joining,
    selectedBoardId,
    onJoinBoard,
}: BoardRowProps) {
    const theme = useTheme();
    const styles = useBoardSelectionStyles();
    const isJoiningBoard = joining && selectedBoardId === board.boardId;

    return (
        <ThemedView style={styles.boardRow}>
            <ThemedView style={styles.boardInfo}>
                <ThemedText type="subtitle" style={styles.boardName} numberOfLines={1}>
                    {board.boardName}
                </ThemedText>

                <ThemedView style={styles.boardMeta}>
                    <ThemedView style={styles.boardBadge}>
                        <ThemedText style={styles.badgeText}>
                            {board.visibleToPublic ? 'Public' : 'Private'}
                        </ThemedText>
                    </ThemedView>
                </ThemedView>
            </ThemedView>

            <Button
                showText={true}
                buttonText={isJoiningBoard ? 'Joining...' : 'Join'}
                onPress={() => onJoinBoard(board.boardId)}
                disabled={joining}
                style={styles.joinButton}
                textStyle={styles.buttonText}
                backgroundColor={theme.actionPrimary}
                borderRadius={Radius.sm}
            />
        </ThemedView>
    );
}

type EmptyBoardsStateProps = {
    message: string;
};

function EmptyBoardsState({ message }: EmptyBoardsStateProps) {
    const styles = useBoardSelectionStyles();

    return (
        <ThemedView style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>{message}</ThemedText>
        </ThemedView>
    );
}

type ErrorBannerProps = {
    message: string;
};

function ErrorBanner({ message }: ErrorBannerProps) {
    const styles = useBoardSelectionStyles();

    return (
        <ThemedView style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{message}</ThemedText>
        </ThemedView>
    );
}

function useBoardSelectionStyles() {
    const theme = useTheme();

    return useMemo(() => createBoardSelectionStyles(theme), [theme]);
}

function createBoardSelectionStyles(theme: AppTheme) {
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
            gap: Spacing.three,
            zIndex: 10,
        },

        headerTop: {
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

        headerActionWrap: {
            position: 'relative',
            alignItems: 'flex-end',
            zIndex: 20,
        },

        actionsButton: {
            minHeight: ControlSize.md,
            paddingHorizontal: Spacing.three,
            paddingVertical: Spacing.two,
        },

        actionMenu: {
            position: 'absolute',
            top: ControlSize.md + Spacing.one,
            right: 0,
            width: 220,
            borderWidth: 1,
            borderColor: theme.borderAccent,
            borderRadius: Radius.sm,
            paddingVertical: Spacing.one,
            backgroundColor: theme.surfaceRaised,
            shadowColor: theme.shadow,
            shadowOpacity: 0.24,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
        },

        actionMenuItem: {
            minHeight: 44,
            justifyContent: 'center',
            paddingHorizontal: Spacing.three,
            paddingVertical: Spacing.two,
        },

        actionMenuItemPressed: {
            backgroundColor: theme.backgroundSelected,
        },

        actionMenuItemText: {
            fontSize: 15,
            lineHeight: 20,
            fontWeight: '700',
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
            gap: Spacing.two,
            flexWrap: 'wrap',
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

        modalCardWide: {
            maxWidth: 480,
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

        modalForm: {
            gap: Spacing.two,
            backgroundColor: theme.surfaceRaised,
        },

        profileSearchError: {
            color: theme.dangerText,
            fontSize: 14,
            lineHeight: 20,
            marginTop: Spacing.one,
        },

        profileResultCard: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: Spacing.three,
            borderWidth: 1,
            borderColor: theme.borderSubtle,
            borderRadius: Radius.sm,
            padding: Spacing.three,
            marginTop: Spacing.one,
            backgroundColor: theme.surfacePreview,
        },

        profileAvatarFrame: {
            width: 68,
            height: 68,
            borderRadius: 34,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.borderAccent,
            backgroundColor: theme.surfaceInput,
        },

        profileAvatarImage: {
            width: '100%',
            height: '100%',
        },

        profileAvatarInitial: {
            color: theme.text,
            fontSize: 26,
            fontWeight: '800',
        },

        profileResultCopy: {
            flex: 1,
            minWidth: 0,
            gap: Spacing.half,
            backgroundColor: theme.surfacePreview,
        },

        profileDisplayName: {
            fontSize: 17,
            lineHeight: 22,
            fontWeight: '800',
            color: theme.text,
        },

        profileUserName: {
            fontSize: 13,
            lineHeight: 18,
            color: theme.textSecondary,
        },

        profileBlurb: {
            fontSize: 14,
            lineHeight: 20,
            color: theme.text,
            marginTop: Spacing.one,
        },

        profileBlurbEmpty: {
            fontSize: 14,
            lineHeight: 20,
            color: theme.textSecondary,
            marginTop: Spacing.one,
            fontStyle: 'italic',
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
            marginTop: Spacing.one,
            backgroundColor: theme.surfaceRaised,
        },

        primaryButton: {
            minHeight: 42,
            paddingHorizontal: Spacing.three,
            paddingVertical: Spacing.two,
        },

        secondaryButton: {
            minHeight: 42,
            paddingHorizontal: Spacing.three,
            paddingVertical: Spacing.two,
        },

        modalCloseButton: {
            position: 'absolute',
            top: Spacing.four,
            right: Spacing.four,
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.borderOverlay,
            backgroundColor: theme.surfaceOverlayControl,
        },

        pressedControl: {
            opacity: 0.82,
        },

        disabledControl: {
            opacity: 0.45,
        },
    });
}
