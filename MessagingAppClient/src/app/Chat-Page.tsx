import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as APIHandler from '@/APIHandlers/ApiHandlerHub';
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

const BOTTOM_THRESHOLD = 48;

export default function ChatScreen() {
    const params = useLocalSearchParams();
    const rawBoardId = params.boardId as string | undefined;
    const boardId = rawBoardId ? parseInt(rawBoardId) : NaN;
    const isValidBoardId = !!rawBoardId && Number.isFinite(boardId);
    const router = useRouter();

    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
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
            router.replace('../boards');
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
        if (!text.trim()) return;

        if (!session) {
            Alert.alert('Session expired', 'Please log in again before sending a message.');
            router.replace('../registration');
            return;
        }

        try {
            setLoading(true);
            await APIHandler.sendMessage(text, boardId);
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

    const handleNewUserRequest = async () => {
        router.push({
            pathname: '../approval-requests',
            params: { boardId: boardId.toString() },
        });
    };

    const handleBackToBoards = () => {
        router.back();
    };

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
                                sender={message.fromusername}
                                message={message.content}
                                timestamp={message.timestamp}
                                isSentByCurrentUser={message.fromusername === session?.userName}
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

                <ThemedView style={styles.composer}>
                    <TextInput
                        style={styles.messageInput}
                        value={text}
                        onChangeText={setText}
                        placeholder="Type a message..."
                        placeholderTextColor="#8E95A8"
                        multiline
                        editable={!loading}
                    />

                    <Button
                        showText={false}
                        showImage={true}
                        imageSource={require("../../assets/images/SendButton.png")}
                        onPress={handleSendMessage}
                        disabled={loading || !session || !isValidBoardId || text.trim().length === 0}
                        width={48}
                        height={48}
                        borderRadius={8}
                        imageWidth={24}
                        imageHeight={24}
                    />
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

    composer: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: Spacing.two,
        paddingTop: Spacing.two,
        paddingBottom: Spacing.one,
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
