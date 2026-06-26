import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
    ActivityIndicator,
    Alert,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as APIHandler from '@/APIHandlers/ApiHandlerHub';
import type { ImageUploadInput } from '@/APIHandlers/ApiHandlerHub';
import type MessageClass from '@/components/Models/message-class';
import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';
import { Button } from '@/components/ui/generic-button';
import { MessageBox } from '@/components/ui/message-box';
import { ControlSize, MaxContentWidth, Radius, Spacing, type AppTheme } from '@/constants/theme';
import { useBoardDetails } from '@/hooks/API/use-board-details';
import { useBoardJoinRequests } from '@/hooks/API/use-board-join-requests';
import { useMessages } from '@/hooks/API/use-messages';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/hooks/use-session';
import { createImageUploadInput, SUPPORTED_IMAGE_TYPES } from '@/utils/image-upload';

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
    const { data: joinRequests } = useBoardJoinRequests(boardId, isValidBoardId);

    const messages = messagesData ?? [];
    const boardTitle = boardInfo?.boardName ?? `Board ${boardId}`;
    const uniqueBoardId = boardInfo?.uniqueBoardId ?? null;
    const hasJoinRequests = (joinRequests ?? []).length > 0;
    const canUseBoardActions = !!session && isValidBoardId;
    const canPickImage = !loading && canUseBoardActions;
    const canSendMessage = canUseBoardActions && !loading && (text.trim().length > 0 || !!selectedImage);

    useEffect(() => {
        if (!isValidBoardId) {
            router.replace('../Homescreen-Board-Select-Page');
        }
    }, [isValidBoardId, router]);

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

    const handleBackToBoards = () => {
        router.push('../Homescreen-Board-Select-Page');
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ChatHeader
                    boardTitle={boardTitle}
                    uniqueBoardId={uniqueBoardId}
                    hasJoinRequests={hasJoinRequests}
                    onBackPress={handleBackToBoards}
                    onJoinRequestsPress={handleNewUserRequest}
                />

                <BoardInviteBar
                    inviteUserName={inviteUserName}
                    invitingUser={invitingUser}
                    disabled={invitingUser || !canUseBoardActions}
                    onChangeInviteUserName={setInviteUserName}
                    onInviteUser={handleInviteUser}
                />

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
            </SafeAreaView>
        </ThemedView>
    );
}

type ChatHeaderProps = {
    boardTitle: string;
    uniqueBoardId: string | null;
    hasJoinRequests: boolean;
    onBackPress: () => void;
    onJoinRequestsPress: () => void;
};

function ChatHeader({
    boardTitle,
    uniqueBoardId,
    hasJoinRequests,
    onBackPress,
    onJoinRequestsPress,
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

            {hasJoinRequests ? (
                <Button
                    showText
                    buttonText="Join Requests"
                    onPress={onJoinRequestsPress}
                    style={[styles.backButton, !IS_WEB && styles.backButtonMobile]}
                    borderWidth={2}
                    backgroundColor={theme.buttonBackground}
                    borderColor={theme.borderAccent}
                    borderRadius={Radius.sm}
                />
            ) : null}
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
        paddingBottom: Spacing.two,
        maxWidth: MaxContentWidth,
        alignSelf: "center",
        width: "100%",
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
        paddingBottom: Spacing.one,
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
