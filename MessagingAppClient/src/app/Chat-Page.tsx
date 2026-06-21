import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
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
import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';
import { Button } from '@/components/ui/generic-button';
import { MessageBox } from '@/components/ui/message-box';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useBoardDetails } from '@/hooks/API/use-board-details';
import { useBoardJoinRequests } from '@/hooks/API/use-board-join-requests';
import { useMessages } from '@/hooks/API/use-messages';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/hooks/use-session';
import { createImageUploadInput, SUPPORTED_IMAGE_TYPES } from '@/utils/image-upload';

const BOTTOM_THRESHOLD = 48;

export default function ChatScreen() {
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

    const theme = useTheme();
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
            if (Platform.OS !== 'web') {
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

    const handleNewUserRequest = async () => {
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

    const format_displayname = (userName:string, displayName?: string) => {
        if (displayName === "" || displayName == null) {
            return userName
        }
        return displayName + ' (' + userName + ')'
    }

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ThemedView style={styles.header}>
                    <Button
                        showText={true}
                        buttonText={'\u2190 Back'}
                        onPress={handleBackToBoards}
                        style={styles.backButton}
                        borderWidth={2}
                        backgroundColor="transparent"
                        borderColor={theme.genericborder}
                        borderRadius={8}
                    />

                    <ThemedView style={{ flex: 1, alignItems: 'center' }}>
                        <ThemedText type="title" style={styles.boardTitle}>{boardTitle}</ThemedText>
                        {uniqueBoardId ? (
                            <ThemedText style={styles.uniqueBoardIdText}>
                                ID: {uniqueBoardId}
                            </ThemedText>
                        ) : null}
                    </ThemedView>

                    {hasJoinRequests ? (
                        <Button
                            showText={true}
                            buttonText="Join Requests"
                            onPress={handleNewUserRequest}
                            style={styles.backButton}
                            borderWidth={2}
                            backgroundColor={theme.buttonBackground}
                            borderColor={theme.genericborder}
                            borderRadius={8}
                        />
                    ) : null}
                </ThemedView>

                <ThemedView style={styles.boardTools}>
                    <TextInput
                        value={inviteUserName}
                        onChangeText={setInviteUserName}
                        placeholder="Invite username"
                        placeholderTextColor="#8E95A8"
                        style={styles.inviteInput}
                        autoCapitalize="none"
                        editable={!invitingUser}
                    />
                    <Button
                        showText={true}
                        buttonText={invitingUser ? 'Inviting...' : 'Invite'}
                        onPress={handleInviteUser}
                        disabled={invitingUser || !session || !isValidBoardId}
                        style={styles.inviteButton}
                        textStyle={styles.inviteButtonText}
                    />
                </ThemedView>

                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messageScroll}
                    contentContainerStyle={styles.messageList}
                    onScroll={handleMessageScroll}
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
                                sender={format_displayname(message.fromusername, message.displayName)}
                                message={message.content}
                                timestamp={message.timestamp}
                                isSentByCurrentUser={message.fromusername === session?.userName}
                                messageType={message.messageType}
                                imageId={message.imageId}
                            />
                        ))
                    )}
                </ScrollView>

                {showScrollToBottom ? (
                    <Button
                        showText={true}
                        buttonText="New messages"
                        onPress={() => scrollToBottom(true)}
                        style={styles.scrollToBottomButton}
                        backgroundColor={theme.buttonBackground}
                        borderRadius={999}
                        textStyle={styles.scrollToBottomButtonText}
                    />
                ) : null}

                <ThemedView style={styles.composerShell}>
                    {selectedImage ? (
                        <ThemedView style={styles.selectedImagePreviewRow}>
                            <Image
                                source={{ uri: selectedImage.uri }}
                                style={styles.selectedImageThumbnail}
                                contentFit="cover"
                            />

                            <ThemedView style={styles.selectedImageCopy}>
                                <ThemedText style={styles.selectedImageTitle} numberOfLines={1}>
                                    Picture ready
                                </ThemedText>
                                <ThemedText style={styles.selectedImageName} numberOfLines={1}>
                                    {selectedImage.name ?? 'Selected photo'}
                                </ThemedText>
                            </ThemedView>

                            <Pressable
                                onPress={() => setSelectedImage(null)}
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
                                    tintColor="#ffffff"
                                />
                            </Pressable>
                        </ThemedView>
                    ) : null}

                    <ThemedView style={styles.composer}>
                        <Pressable
                            onPress={handlePickImage}
                            disabled={loading || !session || !isValidBoardId}
                            accessibilityRole="button"
                            accessibilityLabel="Choose a picture"
                            style={({ pressed }) => [
                                styles.photoButton,
                                pressed && styles.iconButtonPressed,
                                (loading || !session || !isValidBoardId) && styles.iconButtonDisabled,
                            ]}
                        >
                            {loading && selectedImage ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <SymbolView
                                    name={{ ios: 'photo', android: 'add_photo_alternate', web: 'add_photo_alternate' }}
                                    size={24}
                                    weight="bold"
                                    tintColor="#ffffff"
                                />
                            )}
                        </Pressable>

                        <TextInput
                            style={styles.messageInput}
                            value={text}
                            onChangeText={setText}
                            placeholder={selectedImage ? 'Add a caption...' : 'Type a message...'}
                            placeholderTextColor="#8E95A8"
                            multiline
                            editable={!loading}
                        />

                        <Button
                            showText={false}
                            showImage={true}
                            imageSource={require("../../assets/images/SendButton.png")}
                            onPress={handleSendMessage}
                            disabled={loading || !session || !isValidBoardId || (text.trim().length === 0 && !selectedImage)}
                            width={48}
                            height={48}
                            borderRadius={8}
                            imageWidth={24}
                            imageHeight={24}
                        />
                    </ThemedView>
                </ThemedView>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
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
        paddingVertical: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#40404080',
        marginBottom: -Spacing.two,
        marginTop: Spacing.two,
    },

    backButton: {
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.one,
    },

    boardTitle: {
        flex: 1,
        fontSize: 24,
        fontWeight: '600',
    },

    uniqueBoardIdText: {
        fontSize: 12,
        opacity: 0.7,
        marginTop: Spacing.one,
    },

    boardTools: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.one,
    },

    inviteInput: {
        flex: 1,
        minHeight: 42,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#4DACFF80',
        backgroundColor: '#151923',
        color: '#ffffff',
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
    },

    inviteButton: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        minHeight: 42,
    },

    inviteButtonText: {
        color: '#ffffff',
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
        alignItems: "flex-end",
        gap: Spacing.two,
    },

    selectedImagePreviewRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.two,
        padding: Spacing.two,
        borderWidth: 1,
        borderColor: "#4DACFF80",
        borderRadius: 16,
        backgroundColor: "#151923",
    },

    selectedImageThumbnail: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: "#0B0D14",
    },

    selectedImageCopy: {
        flex: 1,
        minWidth: 0,
    },

    selectedImageTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#ffffff",
    },

    selectedImageName: {
        marginTop: Spacing.half,
        fontSize: 12,
        color: "#B0B4BA",
    },

    photoButton: {
        width: 48,
        height: 48,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#262f4b",
        borderWidth: 1,
        borderColor: "#4DACFF80",
    },

    removeImageButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#303342",
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
        shadowColor: '#000000',
        shadowOpacity: 0.24,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },

    scrollToBottomButtonText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '700',
    },

    container: {
        flex: 1,
        backgroundColor: "#000000",
    },

    messageInput: {
        flex: 1,
        minHeight: 48,
        maxHeight: 120,
        fontSize: 17,
        backgroundColor: "#262f4b",
        color: "#ffffff",
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        borderRadius: 24,
        textAlignVertical: "center",
    },
});
