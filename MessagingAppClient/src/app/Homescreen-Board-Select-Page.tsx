import { type ReactNode, useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';

import * as APIHandler from '@/APIHandlers/ApiHandlerHub';
import type { MessageBoard, PublicProfileResponse } from '@/APIHandlers/ApiHandlerHub';
import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';
import { Button } from '@/components/ui/generic-button';
import { UserProfileCard } from '@/components/ui/user-profile-card';
import { BottomTabInset, ControlSize, MaxContentWidth, Radius, Spacing, type AppTheme } from '@/constants/theme';
import { useBoards } from '@/hooks/API/use-boards';
import {
    getProfileCacheKey,
    type PublicProfileByUserName,
    usePublicProfilesByUserName,
} from '@/hooks/API/use-public-profiles-by-user-name';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import {
    createHiddenPrivateUserChatPassword,
    createPrivateUserChatBoardName,
    formatPrivateUserChatParticipantLabel,
    getOtherPrivateUserChatUserName,
} from '@/utils/private-user-chat';

const IS_WEB = Platform.OS === 'web';

export default function BoardSelectionScreen() {
    const [joinBoardId, setJoinBoardId] = useState('');
    const [joinPassword, setJoinPassword] = useState('');
    const [joiningByCode, setJoiningByCode] = useState(false);
    const [actionError, setActionError] = useState('');
    const [actionsMenuVisible, setActionsMenuVisible] = useState(false);
    const [boardOptionsBoard, setBoardOptionsBoard] = useState<MessageBoard | null>(null);
    const [leavingBoardId, setLeavingBoardId] = useState<number | null>(null);
    const [leaveConfirmationBoardId, setLeaveConfirmationBoardId] = useState<number | null>(null);
    const [favoriteUpdatingBoardId, setFavoriteUpdatingBoardId] = useState<number | null>(null);
    const [privateJoinVisible, setPrivateJoinVisible] = useState(false);
    const [profileSearchVisible, setProfileSearchVisible] = useState(false);
    const [profileSearchUserName, setProfileSearchUserName] = useState('');
    const [profileSearchResult, setProfileSearchResult] = useState<PublicProfileResponse | null>(null);
    const [profileSearchError, setProfileSearchError] = useState('');
    const [searchingProfile, setSearchingProfile] = useState(false);
    const [openingPrivateChatForUserName, setOpeningPrivateChatForUserName] = useState<string | null>(null);
    const router = useRouter();
    const styles = useBoardSelectionStyles();
    const { session } = useSession();

    const {
        data: boardsData,
        loading: boardsLoading,
        error: boardsError,
        refresh: refreshBoards,
    } = useBoards();
    const boards = useMemo(
        () => (boardsData ?? []).filter((board) => board.isMember),
        [boardsData]
    );
    const sortedBoards = useMemo(() => sortBoardsByFavorite(boards), [boards]);
    const errorMessage = actionError || boardsError?.message || '';
    const privateChatUserNames = useMemo(
        () => getPrivateChatUserNamesFromBoards(boards, session?.userName),
        [boards, session?.userName]
    );
    const privateChatProfilesByUserName = usePublicProfilesByUserName(privateChatUserNames);

    const handleCreateBoard = () => {
        setActionsMenuVisible(false);
        router.push('/Board-Creation-Page');
    };

    const handleBrowseBoards = () => {
        setActionsMenuVisible(false);
        router.push('../Browse-Boards-Page');
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
        if (searchingProfile || openingPrivateChatForUserName) {
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

    const handleOpenBoard = (boardId: number) => {
        router.push({
            pathname: '../Chat-Page',
            params: { boardId: boardId.toString() },
        });
    };

    const handleOpenBoardOptions = (board: MessageBoard) => {
        setActionError('');
        setLeaveConfirmationBoardId(null);
        setBoardOptionsBoard(board);
    };

    const handleCloseBoardOptions = () => {
        if (leavingBoardId !== null || favoriteUpdatingBoardId !== null) {
            return;
        }

        setBoardOptionsBoard(null);
        setLeaveConfirmationBoardId(null);
    };

    const handleToggleSelectedBoardFavorite = () => {
        const board = boardOptionsBoard;

        if (!board || leavingBoardId !== null || favoriteUpdatingBoardId !== null) {
            return;
        }

        void toggleFavoriteBoard(board);
    };

    const handleLeaveSelectedBoard = () => {
        const board = boardOptionsBoard;

        if (!board || leavingBoardId !== null) {
            return;
        }

        setLeaveConfirmationBoardId(board.boardId);
    };

    const handleCancelLeaveSelectedBoard = () => {
        if (leavingBoardId !== null) {
            return;
        }

        setLeaveConfirmationBoardId(null);
    };

    const handleConfirmLeaveSelectedBoard = () => {
        const board = boardOptionsBoard;

        if (!board || leavingBoardId !== null) {
            return;
        }

        void leaveBoard(board);
    };

    const leaveBoard = async (board: MessageBoard) => {
        try {
            setLeavingBoardId(board.boardId);
            setActionError('');
            await APIHandler.leaveBoard(board.boardId);
            setBoardOptionsBoard(null);
            setLeaveConfirmationBoardId(null);
            await refreshBoards();
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unable to leave message board.';
            setActionError(errorMessage);
            setLeaveConfirmationBoardId(null);
            console.error('Leave board error:', err);
        }
        finally {
            setLeavingBoardId(null);
        }
    };

    const toggleFavoriteBoard = async (board: MessageBoard) => {
        try {
            setFavoriteUpdatingBoardId(board.boardId);
            setActionError('');

            if (board.isFavorite) {
                await APIHandler.removeFavoriteBoard(board.boardId);
            }
            else {
                await APIHandler.addFavoriteBoard(board.boardId);
            }

            setBoardOptionsBoard(null);
            await refreshBoards();
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unable to update favorite board.';
            setActionError(errorMessage);
            console.error('Favorite board error:', err);
            Alert.alert('Error', errorMessage);
        }
        finally {
            setFavoriteUpdatingBoardId(null);
        }
    };

    const handleOpenPrivateUserChat = async (profile: PublicProfileResponse) => {
        const currentUserName = session?.userName?.trim();
        const otherUserName = profile.userName?.trim();

        if (!session || !currentUserName) {
            Alert.alert('Session expired', 'Please log in again before starting a chat.');
            router.replace('../Login-Registration-Page');
            return;
        }

        if (!otherUserName) {
            Alert.alert('Missing username', 'This profile does not have a usable username.');
            return;
        }

        const privateChatBoardName = createPrivateUserChatBoardName(currentUserName, otherUserName);

        if (!privateChatBoardName) {
            Alert.alert('Unable to start chat', 'Private chats need two different usernames.');
            return;
        }

        const existingPrivateChatBoard = boards.find(
            (board) => board.boardName.toLowerCase() === privateChatBoardName.toLowerCase()
        );

        if (existingPrivateChatBoard) {
            setProfileSearchVisible(false);
            setProfileSearchUserName('');
            setProfileSearchResult(null);
            setProfileSearchError('');
            router.push({
                pathname: '../Chat-Page',
                params: { boardId: existingPrivateChatBoard.boardId.toString() },
            });
            return;
        }

        try {
            setOpeningPrivateChatForUserName(otherUserName);
            setProfileSearchError('');

            const pendingInvites = await APIHandler.getUserBoardInvites();
            const matchingPrivateChatInvite = pendingInvites.find(
                (invite) => invite.boardName.toLowerCase() === privateChatBoardName.toLowerCase()
            );

            if (matchingPrivateChatInvite) {
                await APIHandler.acceptBoardInvite(matchingPrivateChatInvite.boardId);
                const updatedBoards = await refreshBoards();
                const acceptedBoard = updatedBoards?.find(
                    (board) => board.boardId === matchingPrivateChatInvite.boardId
                );

                setProfileSearchVisible(false);
                setProfileSearchUserName('');
                setProfileSearchResult(null);
                setProfileSearchError('');

                router.push({
                    pathname: '../Chat-Page',
                    params: {
                        boardId: (acceptedBoard?.boardId ?? matchingPrivateChatInvite.boardId).toString(),
                    },
                });
                return;
            }

            const createdBoard = await APIHandler.createMessageBoard(
                privateChatBoardName,
                false,
                true,
                createHiddenPrivateUserChatPassword()
            );

            await APIHandler.inviteUserToBoard(createdBoard.boardId, otherUserName);
            const updatedBoards = await refreshBoards();
            const openedBoard = updatedBoards?.find((board) => board.boardId === createdBoard.boardId) ?? createdBoard;

            setProfileSearchVisible(false);
            setProfileSearchUserName('');
            setProfileSearchResult(null);
            setProfileSearchError('');

            router.push({
                pathname: '../Chat-Page',
                params: { boardId: openedBoard.boardId.toString() },
            });
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to start private chat';
            setProfileSearchError(errorMessage);
            console.error('Open private chat error:', err);
            Alert.alert('Error', errorMessage);
        }
        finally {
            setOpeningPrivateChatForUserName(null);
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
                            onBrowseBoards={handleBrowseBoards}
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
                            boards={sortedBoards}
                            loading={boardsLoading}
                            currentUserName={session?.userName}
                            privateChatProfilesByUserName={privateChatProfilesByUserName}
                            onOpenBoard={handleOpenBoard}
                            onOpenBoardOptions={handleOpenBoardOptions}
                        />
                    </ThemedView>
                </ScrollView>

                <BoardOptionsModal
                    board={boardOptionsBoard}
                    leavingBoardId={leavingBoardId}
                    leaveConfirmationBoardId={leaveConfirmationBoardId}
                    favoriteUpdatingBoardId={favoriteUpdatingBoardId}
                    errorMessage={actionError}
                    onToggleFavorite={handleToggleSelectedBoardFavorite}
                    onRequestLeaveBoard={handleLeaveSelectedBoard}
                    onConfirmLeaveBoard={handleConfirmLeaveSelectedBoard}
                    onCancelLeaveBoard={handleCancelLeaveSelectedBoard}
                    onClose={handleCloseBoardOptions}
                />

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
                    openingPrivateChatForUserName={openingPrivateChatForUserName}
                    boards={boards}
                    currentUserName={session?.userName}
                    errorMessage={profileSearchError}
                    onChangeUserName={setProfileSearchUserName}
                    onSearchProfile={handleSearchProfile}
                    onOpenPrivateChat={handleOpenPrivateUserChat}
                    onClose={handleCloseProfileSearch}
                />
            </SafeAreaView>
        </ThemedView>
    );
}

type BoardsHeaderProps = {
    actionsMenuVisible: boolean;
    onToggleActionsMenu: () => void;
    onBrowseBoards: () => void;
    onCreateBoard: () => void;
    onJoinPrivateBoard: () => void;
    onSearchProfiles: () => void;
    onAccount: () => void;
    onRefreshBoards: () => void;
};

function BoardsHeader({
    actionsMenuVisible,
    onToggleActionsMenu,
    onBrowseBoards,
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
                            onBrowseBoards={onBrowseBoards}
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
    onBrowseBoards: () => void;
    onCreateBoard: () => void;
    onJoinPrivateBoard: () => void;
    onSearchProfiles: () => void;
    onAccount: () => void;
    onRefreshBoards: () => void;
};

function BoardActionsMenu({
    onBrowseBoards,
    onCreateBoard,
    onJoinPrivateBoard,
    onSearchProfiles,
    onAccount,
    onRefreshBoards,
}: BoardActionsMenuProps) {
    const styles = useBoardSelectionStyles();

    return (
        <ThemedView style={styles.actionMenu}>
            <ActionMenuItem label="Browse Boards" onPress={onBrowseBoards} />
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
    openingPrivateChatForUserName: string | null;
    boards: MessageBoard[];
    currentUserName?: string | null;
    errorMessage: string;
    onChangeUserName: (value: string) => void;
    onSearchProfile: () => void;
    onOpenPrivateChat: (profile: PublicProfileResponse) => void;
    onClose: () => void;
};

function UserProfileSearchModal({
    visible,
    userName,
    profile,
    searching,
    openingPrivateChatForUserName,
    boards,
    currentUserName,
    errorMessage,
    onChangeUserName,
    onSearchProfile,
    onOpenPrivateChat,
    onClose,
}: UserProfileSearchModalProps) {
    const styles = useBoardSelectionStyles();
    const actionInProgress = searching || !!openingPrivateChatForUserName;

    return (
        <ActionModal
            visible={visible}
            title="Search user profiles"
            subtitle="Look up someone by username."
            closeAccessibilityLabel="Close profile search"
            disabled={actionInProgress}
            size="wide"
            onClose={onClose}
        >
            <ThemedView style={styles.modalForm}>
                <ModalInput
                    value={userName}
                    onChangeText={onChangeUserName}
                    placeholder="Username"
                    editable={!actionInProgress}
                    onSubmitEditing={onSearchProfile}
                />

                <ModalActionRow
                    primaryText={searching ? 'Searching...' : 'Search'}
                    primaryDisabled={actionInProgress}
                    secondaryDisabled={actionInProgress}
                    onPrimaryPress={onSearchProfile}
                    onSecondaryPress={onClose}
                />

                {errorMessage ? (
                    <ThemedText style={styles.profileSearchError}>
                        {errorMessage}
                    </ThemedText>
                ) : null}

                {profile ? (
                    <ProfileResultCard
                        profile={profile}
                        boards={boards}
                        currentUserName={currentUserName}
                        openingPrivateChatForUserName={openingPrivateChatForUserName}
                        onOpenPrivateChat={onOpenPrivateChat}
                    />
                ) : null}
            </ThemedView>
        </ActionModal>
    );
}

type ProfileResultCardProps = {
    profile: PublicProfileResponse;
    boards: MessageBoard[];
    currentUserName?: string | null;
    openingPrivateChatForUserName: string | null;
    onOpenPrivateChat: (profile: PublicProfileResponse) => void;
};

function ProfileResultCard({
    profile,
    boards,
    currentUserName,
    openingPrivateChatForUserName,
    onOpenPrivateChat,
}: ProfileResultCardProps) {
    const userName = profile.userName?.trim() || 'Unknown user';
    const privateChatBoardName = currentUserName
        ? createPrivateUserChatBoardName(currentUserName, userName)
        : null;
    const existingPrivateChatBoard = privateChatBoardName
        ? boards.find((board) => board.boardName.toLowerCase() === privateChatBoardName.toLowerCase())
        : null;
    const isOpeningPrivateChat = openingPrivateChatForUserName?.toLowerCase() === userName.toLowerCase();
    const disablePrivateChatAction = !privateChatBoardName || !!openingPrivateChatForUserName;

    return (
        <UserProfileCard
            profile={profile}
            actionText={existingPrivateChatBoard ? 'Open chat' : 'Start chat'}
            actionLoadingText="Opening..."
            actionInProgress={isOpeningPrivateChat}
            disabled={disablePrivateChatAction}
            onAction={onOpenPrivateChat}
        />
    );
}

type BoardListProps = {
    boards: MessageBoard[];
    loading: boolean;
    currentUserName?: string | null;
    privateChatProfilesByUserName: PublicProfileByUserName;
    onOpenBoard: (boardId: number) => void;
    onOpenBoardOptions: (board: MessageBoard) => void;
};

function BoardList({
    boards,
    loading,
    currentUserName,
    privateChatProfilesByUserName,
    onOpenBoard,
    onOpenBoardOptions,
}: BoardListProps) {
    const styles = useBoardSelectionStyles();

    return (
        <ThemedView style={styles.boardSection}>
            <ThemedView style={styles.boardSectionHeader}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                    Your boards
                </ThemedText>
                <ThemedText style={styles.sectionSubtitle}>
                    {boards.length === 1 ? '1 board' : `${boards.length} boards`}
                </ThemedText>
            </ThemedView>

            {loading && boards.length === 0 ? (
                <EmptyBoardsState message="Loading boards..." />
            ) : boards.length === 0 ? (
                <EmptyBoardsState message="You have not joined any boards yet" />
            ) : (
                <ThemedView style={styles.boardsList}>
                    {boards.map((board) => (
                        <BoardRow
                            key={board.boardId}
                            board={board}
                            currentUserName={currentUserName}
                            privateChatProfilesByUserName={privateChatProfilesByUserName}
                            onOpenBoard={onOpenBoard}
                            onOpenBoardOptions={onOpenBoardOptions}
                        />
                    ))}
                </ThemedView>
            )}
        </ThemedView>
    );
}

type BoardRowProps = {
    board: MessageBoard;
    currentUserName?: string | null;
    privateChatProfilesByUserName: PublicProfileByUserName;
    onOpenBoard: (boardId: number) => void;
    onOpenBoardOptions: (board: MessageBoard) => void;
};

function BoardRow({
    board,
    currentUserName,
    privateChatProfilesByUserName,
    onOpenBoard,
    onOpenBoardOptions,
}: BoardRowProps) {
    const theme = useTheme();
    const styles = useBoardSelectionStyles();
    const privateChatUserName = getOtherPrivateUserChatUserName(board.boardName, currentUserName);
    const privateChatProfile = privateChatUserName
        ? privateChatProfilesByUserName[getProfileCacheKey(privateChatUserName)]
        : null;
    const displayBoardName = privateChatUserName
        ? formatPrivateUserChatParticipantLabel({
            userName: privateChatUserName,
            displayName: privateChatProfile?.displayName,
        })
        : board.boardName;
    const boardTypeLabel = privateChatUserName
        ? 'Direct'
        : board.visibleToPublic
            ? 'Public'
            : 'Private';

    return (
        <ThemedView style={styles.boardRow}>
            <ThemedView style={styles.boardInfo}>
                <ThemedText type="subtitle" style={styles.boardName} numberOfLines={1}>
                    {displayBoardName}
                </ThemedText>

                <ThemedView style={styles.boardMeta}>
                    {board.isFavorite ? (
                        <ThemedView style={styles.favoriteBadge}>
                            <SymbolView
                                name={{ ios: 'star.fill', android: 'star', web: 'star' }}
                                size={13}
                                weight="bold"
                                tintColor={theme.actionSuccess}
                            />
                            <ThemedText style={styles.favoriteBadgeText}>
                                Favorite
                            </ThemedText>
                        </ThemedView>
                    ) : null}

                    <ThemedView style={styles.boardBadge}>
                        <ThemedText style={styles.badgeText}>
                            {boardTypeLabel}
                        </ThemedText>
                    </ThemedView>
                </ThemedView>
            </ThemedView>

            <ThemedView style={styles.boardActions}>
                <Pressable
                    onPress={() => onOpenBoardOptions(board)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open options for ${displayBoardName}`}
                    style={({ pressed }) => [
                        styles.boardOptionsButton,
                        pressed && styles.actionMenuItemPressed,
                    ]}
                >
                    <SymbolView
                        name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
                        size={22}
                        weight="bold"
                        tintColor={theme.text}
                    />
                </Pressable>

                <Button
                    showText={true}
                    buttonText="Open"
                    onPress={() => onOpenBoard(board.boardId)}
                    style={styles.joinButton}
                    textStyle={styles.buttonText}
                    backgroundColor={theme.actionPrimary}
                    borderRadius={Radius.sm}
                />
            </ThemedView>
        </ThemedView>
    );
}

type BoardOptionsModalProps = {
    board: MessageBoard | null;
    leavingBoardId: number | null;
    leaveConfirmationBoardId: number | null;
    favoriteUpdatingBoardId: number | null;
    errorMessage: string;
    onToggleFavorite: () => void;
    onRequestLeaveBoard: () => void;
    onConfirmLeaveBoard: () => void;
    onCancelLeaveBoard: () => void;
    onClose: () => void;
};

function BoardOptionsModal({
    board,
    leavingBoardId,
    leaveConfirmationBoardId,
    favoriteUpdatingBoardId,
    errorMessage,
    onToggleFavorite,
    onRequestLeaveBoard,
    onConfirmLeaveBoard,
    onCancelLeaveBoard,
    onClose,
}: BoardOptionsModalProps) {
    const theme = useTheme();
    const styles = useBoardSelectionStyles();
    const leavingThisBoard = !!board && leavingBoardId === board.boardId;
    const confirmingLeaveThisBoard = !!board && leaveConfirmationBoardId === board.boardId;
    const favoriteUpdatingThisBoard = !!board && favoriteUpdatingBoardId === board.boardId;
    const optionsDisabled = leavingBoardId !== null || favoriteUpdatingBoardId !== null;

    return (
        <ActionModal
            visible={!!board}
            title="Board options"
            subtitle={board?.boardName ?? ''}
            closeAccessibilityLabel="Close board options"
            disabled={optionsDisabled}
            onClose={onClose}
        >
            <ThemedView style={styles.boardOptionsMenu}>
                {errorMessage ? (
                    <ThemedView style={styles.boardOptionsNotice}>
                        <ThemedText style={styles.boardOptionsNoticeText}>
                            {errorMessage}
                        </ThemedText>
                    </ThemedView>
                ) : null}

                <Pressable
                    onPress={onToggleFavorite}
                    disabled={!board || optionsDisabled}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                        styles.boardOptionsMenuItem,
                        styles.boardOptionsMenuItemNeutral,
                        pressed && styles.actionMenuItemPressed,
                        (!board || optionsDisabled) && styles.disabledControl,
                    ]}
                >
                    <ThemedText style={styles.boardOptionsMenuText}>
                        {favoriteUpdatingThisBoard
                            ? 'Updating...'
                            : board?.isFavorite
                                ? 'Remove Favorite'
                                : 'Add Favorite'}
                    </ThemedText>
                </Pressable>

                {confirmingLeaveThisBoard ? (
                    <ThemedView style={styles.boardOptionsConfirm}>
                        <ThemedText style={styles.boardOptionsConfirmText}>
                            Leave this board?
                        </ThemedText>

                        <ThemedView style={styles.boardOptionsConfirmActions}>
                            <Button
                                showText={true}
                                buttonText={leavingThisBoard ? 'Leaving...' : 'Leave'}
                                onPress={onConfirmLeaveBoard}
                                disabled={!board || optionsDisabled}
                                style={styles.boardOptionsConfirmButton}
                                textStyle={styles.buttonText}
                                backgroundColor={theme.actionDanger}
                                borderRadius={Radius.sm}
                            />

                            <Button
                                showText={true}
                                buttonText="Cancel"
                                onPress={onCancelLeaveBoard}
                                disabled={optionsDisabled}
                                style={styles.boardOptionsConfirmButton}
                                textStyle={styles.buttonText}
                                backgroundColor={theme.actionDisabled}
                                borderRadius={Radius.sm}
                            />
                        </ThemedView>
                    </ThemedView>
                ) : (
                    <Pressable
                        onPress={onRequestLeaveBoard}
                        disabled={!board || optionsDisabled}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                            styles.boardOptionsMenuItem,
                            styles.boardOptionsMenuItemDanger,
                            pressed && styles.actionMenuItemPressed,
                            (!board || optionsDisabled) && styles.disabledControl,
                        ]}
                    >
                        <ThemedText style={styles.boardOptionsDangerText}>
                            {leavingThisBoard ? 'Leaving...' : 'Leave Board'}
                        </ThemedText>
                    </Pressable>
                )}
            </ThemedView>
        </ActionModal>
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

function getPrivateChatUserNamesFromBoards(
    boards: MessageBoard[],
    currentUserName?: string | null
): string[] {
    const userNames = new Map<string, string>();

    for (const board of boards) {
        const otherUserName = getOtherPrivateUserChatUserName(board.boardName, currentUserName);

        if (otherUserName) {
            userNames.set(getProfileCacheKey(otherUserName), otherUserName);
        }
    }

    return Array.from(userNames.values());
}

function sortBoardsByFavorite(boards: MessageBoard[]): MessageBoard[] {
    return boards
        .map((board, index) => ({ board, index }))
        .sort((left, right) => {
            const favoriteOrder = Number(!!right.board.isFavorite) - Number(!!left.board.isFavorite);

            if (favoriteOrder !== 0) {
                return favoriteOrder;
            }

            return left.index - right.index;
        })
        .map(({ board }) => board);
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

        favoriteBadge: {
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.one,
            borderWidth: 1,
            borderColor: theme.actionSuccess,
            borderRadius: Radius.round,
            paddingHorizontal: Spacing.two,
            paddingVertical: Spacing.half,
            backgroundColor: theme.surfaceInput,
        },

        favoriteBadgeText: {
            color: theme.actionSuccess,
            fontSize: 12,
            lineHeight: 16,
            fontWeight: '800',
        },

        badgeText: {
            color: theme.textSecondary,
            fontSize: 12,
            lineHeight: 16,
            fontWeight: '700',
        },

        boardActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.two,
            backgroundColor: theme.surfacePreview,
        },

        boardOptionsButton: {
            width: 40,
            height: 40,
            borderWidth: 1,
            borderColor: theme.borderSubtle,
            borderRadius: Radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.surfaceInput,
        },

        boardOptionsMenu: {
            gap: Spacing.two,
            backgroundColor: theme.surfaceRaised,
        },

        boardOptionsNotice: {
            borderWidth: 1,
            borderColor: theme.actionDanger,
            borderRadius: Radius.sm,
            paddingHorizontal: Spacing.three,
            paddingVertical: Spacing.two,
            backgroundColor: theme.dangerSurface,
        },

        boardOptionsNoticeText: {
            color: theme.dangerText,
            fontSize: 14,
            lineHeight: 20,
            fontWeight: '700',
        },

        boardOptionsMenuItem: {
            minHeight: 46,
            justifyContent: 'center',
            borderWidth: 1,
            borderRadius: Radius.sm,
            paddingHorizontal: Spacing.three,
            paddingVertical: Spacing.two,
        },

        boardOptionsMenuItemNeutral: {
            borderColor: theme.borderAccent,
            backgroundColor: theme.surfaceInput,
        },

        boardOptionsMenuItemDanger: {
            borderColor: theme.actionDanger,
            backgroundColor: theme.dangerSurface,
        },

        boardOptionsMenuText: {
            color: theme.text,
            fontSize: 15,
            lineHeight: 20,
            fontWeight: '800',
        },

        boardOptionsConfirm: {
            gap: Spacing.two,
            borderWidth: 1,
            borderColor: theme.actionDanger,
            borderRadius: Radius.sm,
            padding: Spacing.three,
            backgroundColor: theme.dangerSurface,
        },

        boardOptionsConfirmText: {
            color: theme.dangerText,
            fontSize: 15,
            lineHeight: 20,
            fontWeight: '800',
        },

        boardOptionsConfirmActions: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: Spacing.two,
            backgroundColor: 'transparent',
        },

        boardOptionsConfirmButton: {
            minHeight: 40,
            minWidth: 96,
            paddingHorizontal: Spacing.three,
            paddingVertical: Spacing.two,
        },

        boardOptionsDangerText: {
            color: theme.dangerText,
            fontSize: 15,
            lineHeight: 20,
            fontWeight: '800',
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
