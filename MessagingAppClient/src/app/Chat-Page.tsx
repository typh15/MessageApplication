import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import * as APIHandler from '@/APIHandlers/ApiHandlerHub';
import type { ImageUploadInput, MessageBoard, PublicProfileResponse } from '@/APIHandlers/ApiHandlerHub';
import type MessageClass from '@/components/Models/message-class';
import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';
import { Button } from '@/components/ui/generic-button';
import { MessageBox } from '@/components/ui/message-box';
import { UserProfileCard } from '@/components/ui/user-profile-card';
import { ControlSize, MaxContentWidth, Radius, Spacing, type AppTheme } from '@/constants/theme';
import { useBoardDetails } from '@/hooks/API/use-board-details';
import { useBoardJoinRequests } from '@/hooks/API/use-board-join-requests';
import { useMessages } from '@/hooks/API/use-messages';
import {
    getProfileCacheKey,
    usePublicProfilesByUserName,
} from '@/hooks/API/use-public-profiles-by-user-name';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/hooks/use-session';
import { createImageUploadInput, SUPPORTED_IMAGE_TYPES } from '@/utils/image-upload';
import {
    createHiddenPrivateUserChatPassword,
    createPrivateUserChatBoardName,
    formatPrivateUserChatParticipantLabel,
    getOtherPrivateUserChatUserName,
} from '@/utils/private-user-chat';

const BOTTOM_THRESHOLD = 48;
const COMPOSER_CONTROL_SIZE = ControlSize.lg;
const IS_WEB = Platform.OS === 'web';

export default function ChatScreen() {
    const styles = useChatStyles();
    const params = useLocalSearchParams();
    const rawBoardId = params.boardId as string | undefined;
    const boardId = rawBoardId ? parseInt(rawBoardId) : NaN;
    const isValidBoardId = !!rawBoardId && Number.isFinite(boardId);
    const router = useRouter();

    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [inviteUserName, setInviteUserName] = useState('');
    const [invitingUser, setInvitingUser] = useState(false);
    const [selectedImage, setSelectedImage] = useState<ImageUploadInput | null>(null);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [boardMembersVisible, setBoardMembersVisible] = useState(false);
    const [boardMembers, setBoardMembers] = useState<PublicProfileResponse[]>([]);
    const [boardMembersBoards, setBoardMembersBoards] = useState<MessageBoard[]>([]);
    const [boardMembersLoading, setBoardMembersLoading] = useState(false);
    const [boardMembersError, setBoardMembersError] = useState('');
    const [openingPrivateChatForUserName, setOpeningPrivateChatForUserName] = useState<string | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const isNearBottomRef = useRef(true);
    const didInitialScrollRef = useRef(false);
    const previousLastMessageIdRef = useRef<string | null>(null);

    const { session } = useSession();
    const {
        data: messagesData,
        refresh: refreshMessages,
    } = useMessages(boardId, isValidBoardId);
    const { data: boardInfo } = useBoardDetails(boardId, isValidBoardId);

    const messages = messagesData ?? [];
    const rawBoardTitle = boardInfo?.boardName ?? `Board ${boardId}`;
    const privateChatUserName = getOtherPrivateUserChatUserName(boardInfo?.boardName ?? '', session?.userName);
    const privateChatProfilesByUserName = usePublicProfilesByUserName(
        privateChatUserName ? [privateChatUserName] : []
    );
    const privateChatProfile = privateChatUserName
        ? privateChatProfilesByUserName[getProfileCacheKey(privateChatUserName)]
        : null;
    const isPrivateUserChat = !!privateChatUserName;
    const boardTitle = privateChatUserName
        ? formatPrivateUserChatParticipantLabel({
            userName: privateChatUserName,
            displayName: privateChatProfile?.displayName,
        })
        : rawBoardTitle;
    const uniqueBoardId = isPrivateUserChat ? null : boardInfo?.uniqueBoardId ?? null;
    const { data: joinRequests } = useBoardJoinRequests(boardId, isValidBoardId && !isPrivateUserChat);
    const hasJoinRequests = !isPrivateUserChat && (joinRequests ?? []).length > 0;
    const canUseBoardActions = !!session && isValidBoardId;
    const canShowInviteBar = !!boardInfo && !isPrivateUserChat;
    const canShowBoardMembers = !!boardInfo && !isPrivateUserChat && canUseBoardActions;
    const canPickImage = !loading && canUseBoardActions;
    const canSendMessage = canUseBoardActions && !loading && (text.trim().length > 0 || !!selectedImage);
    const safeAreaEdges: Edge[] = isKeyboardVisible
        ? ['top', 'left', 'right']
        : ['top', 'left', 'right', 'bottom'];

    useEffect(() => {
        if (!isValidBoardId) {
            router.replace('../Homescreen-Board-Select-Page');
        }
    }, [isValidBoardId, router]);

    useEffect(() => {
        if (IS_WEB) {
            return;
        }

        const keyboardShowEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const keyboardHideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const showSubscription = Keyboard.addListener(keyboardShowEvent, () => setIsKeyboardVisible(true));
        const hideSubscription = Keyboard.addListener(keyboardHideEvent, () => setIsKeyboardVisible(false));

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    const scrollToBottom = (animated: boolean = true) => {
        scrollViewRef.current?.scrollToEnd({ animated });
        isNearBottomRef.current = true;
        setShowScrollToBottom(false);
    };

    const handleMessageScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
        const isNearBottom = distanceFromBottom <= BOTTOM_THRESHOLD;

        isNearBottomRef.current = isNearBottom;

        if (isNearBottom) {
            setShowScrollToBottom(false);
        }
    };

    useEffect(() => {
        const lastMessageId = messages.at(-1)?.id ?? null;

        if (!lastMessageId || lastMessageId === previousLastMessageIdRef.current) {
            return;
        }

        previousLastMessageIdRef.current = lastMessageId;

        if (!didInitialScrollRef.current) {
            didInitialScrollRef.current = true;
            requestAnimationFrame(() => scrollToBottom(false));
            return;
        }

        if (isNearBottomRef.current) {
            requestAnimationFrame(() => scrollToBottom(true));
        } else {
            setShowScrollToBottom(true);
        }
    }, [messages]);

    const handleSendMessage = async () => {
        const messageText = text.trim();

        if (!messageText && !selectedImage) return;

        if (!session) {
            Alert.alert('Session expired', 'Please log in again before sending a message.');
            router.replace('../Login-Registration-Page');
            return;
        }

        try {
            setLoading(true);

            if (selectedImage) {
                const uploadedImage = await APIHandler.uploadImage(selectedImage);
                await APIHandler.sendImageMessage(boardId, uploadedImage.imageId, messageText);
                setSelectedImage(null);
            } else {
                await APIHandler.sendMessage(messageText, boardId);
            }

            setText('');
            await refreshMessages();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
            Alert.alert('Error', errorMessage);
            console.error('Send message error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePickImage = async () => {
        if (loading) return;

        if (!session) {
            Alert.alert('Session expired', 'Please log in again before choosing a picture.');
            router.replace('../Login-Registration-Page');
            return;
        }

        try {
            if (!IS_WEB) {
                const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

                if (!permission.granted) {
                    Alert.alert('Photo access needed', 'Please allow photo access to send picture messages.');
                    return;
                }
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: false,
                quality: 0.85,
            });

            if (result.canceled) {
                return;
            }

            const pickedImage = result.assets[0];

            if (!pickedImage?.uri) {
                throw new Error('No picture was selected.');
            }

            const imageInput = createImageUploadInput(pickedImage, 'picture-message');

            if (imageInput.type && !SUPPORTED_IMAGE_TYPES.has(imageInput.type.toLowerCase())) {
                Alert.alert('Unsupported picture', 'Please choose a JPEG, PNG, or WebP image.');
                return;
            }

            setSelectedImage(imageInput);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unable to choose picture';
            Alert.alert('Picture unavailable', errorMessage);
            console.error('Choose picture error:', err);
        }
    };

    const handleNewUserRequest = () => {
        router.push({
            pathname: '../Board-Join-Requests-Page',
            params: { boardId: boardId.toString() },
        });
    };

    const handleInviteUser = async () => {
        const userName = inviteUserName.trim();

        if (!userName) {
            Alert.alert('Enter username', 'Please enter the username to invite.');
            return;
        }

        if (!session) {
            Alert.alert('Session expired', 'Please log in again before inviting a user.');
            router.replace('../Login-Registration-Page');
            return;
        }

        try {
            setInvitingUser(true);
            await APIHandler.inviteUserToBoard(boardId, userName);
            setInviteUserName('');
            Alert.alert('Invite sent', `${userName} can accept the invite from their account page.`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to invite user';
            Alert.alert('Error', errorMessage);
            console.error('Invite user error:', err);
        } finally {
            setInvitingUser(false);
        }
    };

    const handleOpenBoardMembers = async () => {
        if (!session) {
            Alert.alert('Session expired', 'Please log in again before viewing board members.');
            router.replace('../Login-Registration-Page');
            return;
        }

        try {
            setBoardMembersVisible(true);
            setBoardMembersLoading(true);
            setBoardMembersError('');

            const [members, boards] = await Promise.all([
                APIHandler.getBoardMembers(boardId),
                APIHandler.getMessageBoards(),
            ]);

            setBoardMembersBoards(boards);
            setBoardMembers(sortUserProfiles(
                members.filter((member) => member.uniqueId !== session.uniqueId)
            ));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load board members';
            setBoardMembersError(errorMessage);
            console.error('Load board members error:', err);
        } finally {
            setBoardMembersLoading(false);
        }
    };

    const handleCloseBoardMembers = () => {
        if (boardMembersLoading || openingPrivateChatForUserName) {
            return;
        }

        setBoardMembersVisible(false);
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
            Alert.alert('Missing username', 'This member does not have a usable username.');
            return;
        }

        const privateChatBoardName = createPrivateUserChatBoardName(currentUserName, otherUserName);

        if (!privateChatBoardName) {
            Alert.alert('Unable to start chat', 'Private chats need two different usernames.');
            return;
        }

        try {
            setOpeningPrivateChatForUserName(otherUserName);
            setBoardMembersError('');

            const boards = await APIHandler.getMessageBoards();
            setBoardMembersBoards(boards);

            const existingPrivateChatBoard = boards.find(
                (board) => board.boardName.toLowerCase() === privateChatBoardName.toLowerCase()
            );

            if (existingPrivateChatBoard) {
                setBoardMembersVisible(false);
                router.push({
                    pathname: '../Chat-Page',
                    params: { boardId: existingPrivateChatBoard.boardId.toString() },
                });
                return;
            }

            const pendingInvites = await APIHandler.getUserBoardInvites();
            const matchingPrivateChatInvite = pendingInvites.find(
                (invite) => invite.boardName.toLowerCase() === privateChatBoardName.toLowerCase()
            );

            if (matchingPrivateChatInvite) {
                await APIHandler.acceptBoardInvite(matchingPrivateChatInvite.boardId);
                setBoardMembersVisible(false);
                router.push({
                    pathname: '../Chat-Page',
                    params: { boardId: matchingPrivateChatInvite.boardId.toString() },
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
            setBoardMembersVisible(false);
            router.push({
                pathname: '../Chat-Page',
                params: { boardId: createdBoard.boardId.toString() },
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to start private chat';
            setBoardMembersError(errorMessage);
            console.error('Open private chat error:', err);
            Alert.alert('Error', errorMessage);
        } finally {
            setOpeningPrivateChatForUserName(null);
        }
    };

    const handleBackToBoards = () => {
        router.push('../Homescreen-Board-Select-Page');
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView edges={safeAreaEdges} style={styles.safeArea}>
                <ChatHeader
                    boardTitle={boardTitle}
                    uniqueBoardId={uniqueBoardId}
                    hasJoinRequests={hasJoinRequests}
                    showBoardMembers={canShowBoardMembers}
                    onBackPress={handleBackToBoards}
                    onJoinRequestsPress={handleNewUserRequest}
                    onBoardMembersPress={handleOpenBoardMembers}
                />

                {canShowInviteBar ? (
                    <BoardInviteBar
                        inviteUserName={inviteUserName}
                        invitingUser={invitingUser}
                        disabled={invitingUser || !canUseBoardActions}
                        onChangeInviteUserName={setInviteUserName}
                        onInviteUser={handleInviteUser}
                    />
                ) : null}

                <BoardMembersModal
                    visible={boardMembersVisible}
                    members={boardMembers}
                    boards={boardMembersBoards}
                    currentUserName={session?.userName}
                    loading={boardMembersLoading}
                    errorMessage={boardMembersError}
                    openingPrivateChatForUserName={openingPrivateChatForUserName}
                    onOpenPrivateChat={handleOpenPrivateUserChat}
                    onClose={handleCloseBoardMembers}
                />

                <KeyboardAvoidingView
                    style={styles.chatBody}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    enabled={!IS_WEB}
                >
                    <MessageList
                        messages={messages}
                        currentUserName={session?.userName}
                        scrollViewRef={scrollViewRef}
                        onScroll={handleMessageScroll}
                    />

                    <ScrollToBottomButton
                        visible={showScrollToBottom}
                        onPress={() => scrollToBottom(true)}
                    />

                    <MessageComposer
                        text={text}
                        selectedImage={selectedImage}
                        loading={loading}
                        canPickImage={canPickImage}
                        canSendMessage={canSendMessage}
                        onChangeText={setText}
                        onPickImage={handlePickImage}
                        onSendMessage={handleSendMessage}
                        onRemoveImage={() => setSelectedImage(null)}
                    />
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ThemedView>
    );
}

type ChatHeaderProps = {
    boardTitle: string;
    uniqueBoardId: string | null;
    hasJoinRequests: boolean;
    showBoardMembers: boolean;
    onBackPress: () => void;
    onJoinRequestsPress: () => void;
    onBoardMembersPress: () => void;
};

function ChatHeader({
    boardTitle,
    uniqueBoardId,
    hasJoinRequests,
    showBoardMembers,
    onBackPress,
    onJoinRequestsPress,
    onBoardMembersPress,
}: ChatHeaderProps) {
    const theme = useTheme();
    const styles = useChatStyles();

    return (
        <ThemedView style={[styles.header, !IS_WEB && styles.headerMobile]}>
            <Button
                showText
                buttonText={'\u2190 Back'}
                onPress={onBackPress}
                style={[styles.backButton, !IS_WEB && styles.backButtonMobile]}
                borderWidth={2}
                backgroundColor="transparent"
                borderColor={theme.borderAccent}
                borderRadius={Radius.sm}
            />

            <ThemedView style={[styles.headerTitleBlock, !IS_WEB && styles.headerTitleBlockMobile]}>
                <ThemedText
                    type="title"
                    style={[styles.boardTitle, !IS_WEB && styles.boardTitleMobile]}
                >
                    {boardTitle}
                </ThemedText>

                {uniqueBoardId ? (
                    <ThemedText style={styles.uniqueBoardIdText}>
                        ID: {uniqueBoardId}
                    </ThemedText>
                ) : null}
            </ThemedView>

            <ThemedView style={styles.headerActions}>
                {hasJoinRequests ? (
                    <Button
                        showText
                        buttonText={IS_WEB ? 'Join Requests' : 'Requests'}
                        onPress={onJoinRequestsPress}
                        style={[styles.backButton, !IS_WEB && styles.backButtonMobile]}
                        borderWidth={2}
                        backgroundColor={theme.buttonBackground}
                        borderColor={theme.borderAccent}
                        borderRadius={Radius.sm}
                    />
                ) : null}

                {showBoardMembers ? (
                    <Button
                        showText
                        buttonText={IS_WEB ? 'Board Members' : 'Members'}
                        onPress={onBoardMembersPress}
                        style={[styles.backButton, !IS_WEB && styles.backButtonMobile]}
                        borderWidth={2}
                        backgroundColor={theme.buttonBackground}
                        borderColor={theme.borderAccent}
                        borderRadius={Radius.sm}
                    />
                ) : null}
            </ThemedView>
        </ThemedView>
    );
}

type BoardInviteBarProps = {
    inviteUserName: string;
    invitingUser: boolean;
    disabled: boolean;
    onChangeInviteUserName: (value: string) => void;
    onInviteUser: () => void;
};

function BoardInviteBar({
    inviteUserName,
    invitingUser,
    disabled,
    onChangeInviteUserName,
    onInviteUser,
}: BoardInviteBarProps) {
    const theme = useTheme();
    const styles = useChatStyles();

    return (
        <ThemedView style={[styles.boardTools, !IS_WEB && styles.boardToolsMobile]}>
            <TextInput
                value={inviteUserName}
                onChangeText={onChangeInviteUserName}
                placeholder="Invite username"
                placeholderTextColor={theme.inputPlaceholder}
                style={styles.inviteInput}
                autoCapitalize="none"
                editable={!invitingUser}
            />

            <Button
                showText
                buttonText={invitingUser ? 'Inviting...' : 'Invite'}
                onPress={onInviteUser}
                disabled={disabled}
                backgroundColor={theme.actionPrimary}
                style={styles.inviteButton}
                textStyle={styles.inviteButtonText}
            />
        </ThemedView>
    );
}

type BoardMembersModalProps = {
    visible: boolean;
    members: PublicProfileResponse[];
    boards: MessageBoard[];
    currentUserName?: string | null;
    loading: boolean;
    errorMessage: string;
    openingPrivateChatForUserName: string | null;
    onOpenPrivateChat: (profile: PublicProfileResponse) => void;
    onClose: () => void;
};

function BoardMembersModal({
    visible,
    members,
    boards,
    currentUserName,
    loading,
    errorMessage,
    openingPrivateChatForUserName,
    onOpenPrivateChat,
    onClose,
}: BoardMembersModalProps) {
    const theme = useTheme();
    const styles = useChatStyles();
    const actionInProgress = loading || !!openingPrivateChatForUserName;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <ThemedView style={styles.modalOverlay}>
                <Pressable
                    style={styles.modalBackdrop}
                    onPress={onClose}
                    disabled={actionInProgress}
                />

                <ThemedView style={styles.membersModalCard}>
                    <ThemedView style={styles.membersModalHeader}>
                        <View style={styles.membersModalTitleBlock}>
                            <ThemedText type="subtitle" style={styles.membersModalTitle}>
                                Board Members
                            </ThemedText>
                            <ThemedText style={styles.membersModalSubtitle}>
                                Start a private chat with someone in this board.
                            </ThemedText>
                        </View>

                        <Pressable
                            onPress={onClose}
                            disabled={actionInProgress}
                            accessibilityRole="button"
                            accessibilityLabel="Close board members"
                            style={({ pressed }) => [
                                styles.modalCloseButton,
                                pressed && styles.iconButtonPressed,
                                actionInProgress && styles.iconButtonDisabled,
                            ]}
                        >
                            <SymbolView
                                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                                size={18}
                                weight="bold"
                                tintColor={theme.text}
                            />
                        </Pressable>
                    </ThemedView>

                    {loading ? (
                        <ThemedView style={styles.membersStatusContainer}>
                            <ActivityIndicator color={theme.actionPrimary} />
                            <ThemedText style={styles.membersStatusText}>Loading members...</ThemedText>
                        </ThemedView>
                    ) : errorMessage ? (
                        <ThemedView style={styles.membersStatusContainer}>
                            <ThemedText style={styles.membersErrorText}>{errorMessage}</ThemedText>
                        </ThemedView>
                    ) : members.length === 0 ? (
                        <ThemedView style={styles.membersStatusContainer}>
                            <ThemedText style={styles.membersStatusText}>No other members yet.</ThemedText>
                        </ThemedView>
                    ) : (
                        <ScrollView
                            style={styles.membersList}
                            contentContainerStyle={styles.membersListContent}
                        >
                            {members.map((member) => (
                                <BoardMemberProfileCard
                                    key={member.uniqueId}
                                    profile={member}
                                    boards={boards}
                                    currentUserName={currentUserName}
                                    openingPrivateChatForUserName={openingPrivateChatForUserName}
                                    onOpenPrivateChat={onOpenPrivateChat}
                                />
                            ))}
                        </ScrollView>
                    )}
                </ThemedView>
            </ThemedView>
        </Modal>
    );
}

type BoardMemberProfileCardProps = {
    profile: PublicProfileResponse;
    boards: MessageBoard[];
    currentUserName?: string | null;
    openingPrivateChatForUserName: string | null;
    onOpenPrivateChat: (profile: PublicProfileResponse) => void;
};

function BoardMemberProfileCard({
    profile,
    boards,
    currentUserName,
    openingPrivateChatForUserName,
    onOpenPrivateChat,
}: BoardMemberProfileCardProps) {
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
            actionText={existingPrivateChatBoard ? 'Open chat' : 'Message'}
            actionLoadingText="Opening..."
            actionInProgress={isOpeningPrivateChat}
            disabled={disablePrivateChatAction}
            onAction={onOpenPrivateChat}
        />
    );
}

type MessageListProps = {
    messages: MessageClass[];
    currentUserName?: string;
    scrollViewRef: RefObject<ScrollView | null>;
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

function MessageList({
    messages,
    currentUserName,
    scrollViewRef,
    onScroll,
}: MessageListProps) {
    const styles = useChatStyles();

    return (
        <ScrollView
            ref={scrollViewRef}
            style={styles.messageScroll}
            contentContainerStyle={styles.messageList}
            onScroll={onScroll}
            scrollEventThrottle={80}
        >
            {messages.length === 0 ? (
                <ThemedView style={styles.emptyContainer}>
                    <ThemedText style={styles.emptyText}>No messages yet</ThemedText>
                </ThemedView>
            ) : (
                messages.map((message) => (
                    <MessageBox
                        key={message.id}
                        sender={formatDisplayName(message.fromusername, message.displayName)}
                        message={message.content}
                        timestamp={message.timestamp}
                        isSentByCurrentUser={message.fromusername === currentUserName}
                        messageType={message.messageType}
                        imageId={message.imageId}
                    />
                ))
            )}
        </ScrollView>
    );
}

type ScrollToBottomButtonProps = {
    visible: boolean;
    onPress: () => void;
};

function ScrollToBottomButton({ visible, onPress }: ScrollToBottomButtonProps) {
    const theme = useTheme();
    const styles = useChatStyles();

    if (!visible) {
        return null;
    }

    return (
        <Button
            showText
            buttonText="New messages"
            onPress={onPress}
            style={styles.scrollToBottomButton}
            backgroundColor={theme.buttonBackground}
            borderRadius={Radius.round}
            textStyle={styles.scrollToBottomButtonText}
        />
    );
}

type MessageComposerProps = {
    text: string;
    selectedImage: ImageUploadInput | null;
    loading: boolean;
    canPickImage: boolean;
    canSendMessage: boolean;
    onChangeText: (value: string) => void;
    onPickImage: () => void;
    onSendMessage: () => void;
    onRemoveImage: () => void;
};

function MessageComposer({
    text,
    selectedImage,
    loading,
    canPickImage,
    canSendMessage,
    onChangeText,
    onPickImage,
    onSendMessage,
    onRemoveImage,
}: MessageComposerProps) {
    const theme = useTheme();
    const styles = useChatStyles();

    return (
        <ThemedView style={styles.composerShell}>
            {selectedImage ? (
                <SelectedImagePreview
                    image={selectedImage}
                    loading={loading}
                    onRemoveImage={onRemoveImage}
                />
            ) : null}

            <ThemedView style={styles.composer}>
                <Pressable
                    onPress={onPickImage}
                    disabled={!canPickImage}
                    accessibilityRole="button"
                    accessibilityLabel="Choose a picture"
                    style={({ pressed }) => [
                        styles.photoButton,
                        pressed && styles.iconButtonPressed,
                        !canPickImage && styles.iconButtonDisabled,
                    ]}
                >
                    {loading && selectedImage ? (
                        <ActivityIndicator color={theme.textOnAccent} />
                    ) : (
                        <SymbolView
                            name={{ ios: 'photo', android: 'add_photo_alternate', web: 'add_photo_alternate' }}
                            size={24}
                            weight="bold"
                            tintColor={theme.textOnAccent}
                        />
                    )}
                </Pressable>

                <TextInput
                    style={[styles.messageInput, IS_WEB && styles.messageInputWeb]}
                    value={text}
                    onChangeText={onChangeText}
                    placeholder={selectedImage ? 'Add a caption...' : 'Type a message...'}
                    placeholderTextColor={theme.inputPlaceholder}
                    multiline
                    editable={!loading}
                />

                <Button
                    showText={false}
                    showImage
                    imageSource={require("../../assets/images/SendButton.png")}
                    onPress={onSendMessage}
                    disabled={!canSendMessage}
                    width={COMPOSER_CONTROL_SIZE}
                    height={COMPOSER_CONTROL_SIZE}
                    borderRadius={Radius.sm}
                    imageWidth={24}
                    imageHeight={24}
                />
            </ThemedView>
        </ThemedView>
    );
}

type SelectedImagePreviewProps = {
    image: ImageUploadInput;
    loading: boolean;
    onRemoveImage: () => void;
};

function SelectedImagePreview({
    image,
    loading,
    onRemoveImage,
}: SelectedImagePreviewProps) {
    const theme = useTheme();
    const styles = useChatStyles();

    return (
        <ThemedView style={styles.selectedImagePreviewRow}>
            <Image
                source={{ uri: image.uri }}
                style={styles.selectedImageThumbnail}
                contentFit="cover"
            />

            <ThemedView style={styles.selectedImageCopy}>
                <ThemedText style={styles.selectedImageTitle} numberOfLines={1}>
                    Picture ready
                </ThemedText>
                <ThemedText style={styles.selectedImageName} numberOfLines={1}>
                    {image.name ?? 'Selected photo'}
                </ThemedText>
            </ThemedView>

            <Pressable
                onPress={onRemoveImage}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Remove selected picture"
                style={({ pressed }) => [
                    styles.removeImageButton,
                    pressed && styles.iconButtonPressed,
                    loading && styles.iconButtonDisabled,
                ]}
            >
                <SymbolView
                    name={{ ios: 'xmark', android: 'close', web: 'close' }}
                    size={18}
                    weight="bold"
                    tintColor={theme.textOnAccent}
                />
            </Pressable>
        </ThemedView>
    );
}

function formatDisplayName(userName: string, displayName?: string) {
    if (!displayName) {
        return userName;
    }

    return `${displayName} (${userName})`;
}

function sortUserProfiles(profiles: PublicProfileResponse[]) {
    return [...profiles].sort((left, right) => {
        const leftName = (left.displayName || left.userName || '').toLowerCase();
        const rightName = (right.displayName || right.userName || '').toLowerCase();

        if (leftName !== rightName) {
            return leftName.localeCompare(rightName);
        }

        return (left.userName || '').localeCompare(right.userName || '');
    });
}

function useChatStyles() {
    const theme = useTheme();

    return useMemo(() => createChatStyles(theme), [theme]);
}

function createChatStyles(theme: AppTheme) {
    return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },

    safeArea: {
        flex: 1,
        paddingHorizontal: Spacing.four,
        paddingBottom: 0,
        maxWidth: MaxContentWidth,
        alignSelf: "center",
        width: "100%",
    },

    chatBody: {
        flex: 1,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingTop: Spacing.one,
        paddingBottom: Spacing.two,
        borderBottomWidth: 1,
        borderBottomColor: theme.borderSubtle,
        marginBottom: 0,
        marginTop: Spacing.two,
    },

    headerMobile: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingBottom: Spacing.one,
        marginBottom: 0,
    },

    backButton: {
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.one,
    },

    backButtonMobile: {
        alignSelf: 'center',
    },

    headerTitleBlock: {
        flex: 1,
        alignItems: 'center',
        minWidth: 0,
    },

    headerTitleBlockMobile: {
        flex: 1,
        paddingHorizontal: 0,
    },

    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: Spacing.two,
    },

    boardTitle: {
        flex: 0,
        fontSize: 24,
        lineHeight: 30,
        fontWeight: '600',
        textAlign: 'center',
    },

    boardTitleMobile: {
        flex: 0,
        fontSize: 20,
        lineHeight: 26,
        textAlign: 'center',
    },

    uniqueBoardIdText: {
        fontSize: 12,
        lineHeight: 16,
        opacity: 0.7,
        marginTop: Spacing.half,
    },

    boardTools: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.one,
    },

    boardToolsMobile: {
        paddingTop: Spacing.two,
    },

    inviteInput: {
        flex: 1,
        minHeight: 42,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: theme.borderAccent,
        backgroundColor: theme.surfacePreview,
        color: theme.text,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
    },

    inviteButton: {
        borderRadius: Radius.sm,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        minHeight: 42,
    },

    inviteButtonText: {
        color: theme.textOnAccent,
        fontSize: 14,
        fontWeight: '700',
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

    membersModalCard: {
        width: '100%',
        maxWidth: 560,
        maxHeight: '82%',
        borderWidth: 1,
        borderColor: theme.borderOverlay,
        borderRadius: Radius.sm,
        padding: Spacing.four,
        gap: Spacing.three,
        backgroundColor: theme.surfaceRaised,
    },

    membersModalHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: Spacing.three,
        backgroundColor: theme.surfaceRaised,
    },

    membersModalTitleBlock: {
        flex: 1,
        minWidth: 0,
    },

    membersModalTitle: {
        fontSize: 22,
        lineHeight: 28,
        fontWeight: '700',
    },

    membersModalSubtitle: {
        color: theme.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        marginTop: Spacing.half,
    },

    modalCloseButton: {
        width: 40,
        height: 40,
        borderRadius: Radius.round,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.borderOverlay,
        backgroundColor: theme.surfaceOverlayControl,
    },

    membersStatusContainer: {
        minHeight: 140,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        backgroundColor: theme.surfaceRaised,
    },

    membersStatusText: {
        color: theme.textSecondary,
        fontSize: 15,
        lineHeight: 20,
        textAlign: 'center',
    },

    membersErrorText: {
        color: theme.dangerText,
        fontSize: 15,
        lineHeight: 20,
        textAlign: 'center',
    },

    membersList: {
        maxHeight: 520,
    },

    membersListContent: {
        gap: Spacing.two,
        paddingBottom: Spacing.one,
    },

    messageScroll: {
        flex: 1,
    },

    messageList: {
        paddingTop: Spacing.four,
        paddingBottom: Spacing.four,
        gap: Spacing.two,
    },

    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: Spacing.six,
    },

    emptyText: {
        opacity: 0.6,
        fontSize: 16,
    },

    composerShell: {
        gap: Spacing.two,
        paddingTop: Spacing.two,
    },

    composer: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.two,
    },

    selectedImagePreviewRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.two,
        padding: Spacing.two,
        borderWidth: 1,
        borderColor: theme.borderAccent,
        borderRadius: Radius.sm,
        backgroundColor: theme.surfacePreview,
    },

    selectedImageThumbnail: {
        width: 56,
        height: 56,
        borderRadius: Radius.sm,
        backgroundColor: theme.surfaceImage,
    },

    selectedImageCopy: {
        flex: 1,
        minWidth: 0,
    },

    selectedImageTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: theme.text,
    },

    selectedImageName: {
        marginTop: Spacing.half,
        fontSize: 12,
        color: theme.textSecondary,
    },

    photoButton: {
        width: COMPOSER_CONTROL_SIZE,
        height: COMPOSER_CONTROL_SIZE,
        borderRadius: Radius.sm,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.surfaceInput,
        borderWidth: 1,
        borderColor: theme.borderAccent,
    },

    removeImageButton: {
        width: 36,
        height: 36,
        borderRadius: Radius.sm,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.actionDisabled,
    },

    iconButtonPressed: {
        opacity: 0.75,
        transform: [{ scale: 0.96 }],
    },

    iconButtonDisabled: {
        opacity: 0.45,
    },

    scrollToBottomButton: {
        position: 'absolute',
        right: Spacing.four,
        bottom: 74,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        shadowColor: theme.shadow,
        shadowOpacity: 0.24,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },

    scrollToBottomButtonText: {
        color: theme.textOnAccent,
        fontSize: 13,
        fontWeight: '700',
    },

    messageInput: {
        flex: 1,
        height: COMPOSER_CONTROL_SIZE,
        minHeight: COMPOSER_CONTROL_SIZE,
        maxHeight: COMPOSER_CONTROL_SIZE,
        fontSize: 17,
        backgroundColor: theme.surfaceInput,
        color: theme.text,
        paddingHorizontal: Spacing.three,
        paddingVertical: 0,
        borderRadius: Radius.sm,
        textAlignVertical: "center",
    },

    messageInputWeb: {
        lineHeight: COMPOSER_CONTROL_SIZE,
    },
    });
}
