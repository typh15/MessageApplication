import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRef, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

import { MessageBox } from '@/components/ui/message-box';
import { SendMessageButton } from '@/components/ui/sendmessage-button';
import Message_Repo from '@/MessageRepository';
import Message_Class from '@/components/Models/Message_Class';
import * as APIHandler from '@/ApiHandler';

const update_interval = 0.5; // Update every ___ seconds

export default function ChatScreen() {
    const params = useLocalSearchParams();
    const rawBoardId = params.boardId as string | undefined;
    const boardId = rawBoardId ? parseInt(rawBoardId) : NaN;
    const router = useRouter();

    const messageRepoRef = useRef(new Message_Repo());
    const [text, setText] = useState('');
    const [messageRepo, setMessageRepo] = useState<Message_Class[]>([]);
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const loadUserName = async () => {
        try {
            const name = await AsyncStorage.getItem('username');
            if (name) {
                setUserName(name);
            }
        } catch (err) {
            console.error('Failed to load username:', err);
        }
    };

    const loadMessages = async () => {
        if (!rawBoardId || isNaN(boardId)) {
            // invalid boardId — go back to boards
            router.replace('../boards');
            return;
        }

        try {
            const msgs = await APIHandler.fetchMessages(boardId);
            // reset repo and populate
            messageRepoRef.current = new Message_Repo();
            msgs.forEach(m => messageRepoRef.current.addMessage(m));
            setMessageRepo(messageRepoRef.current.getMessages());
        } catch (err) {
            console.error('Failed to load messages for board', boardId, err);
        }
    };

    useEffect(() => {
        loadUserName();
        loadMessages();
    }, []);

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messageRepo]);

    // Poll for new messages at a fixed interval
    useEffect(() => {
        if (!rawBoardId || isNaN(boardId)) return;

        const intervalId = setInterval(() => {
            loadMessages();
        }, update_interval * 1000);

        return () => clearInterval(intervalId);
    }, [rawBoardId, boardId]);


    const handleSendMessage = async () => {
        if (!text.trim()) return;

        try {
            setLoading(true);
            const savedMessage = await APIHandler.sendMessage(text, userName || 'User', boardId);
            messageRepoRef.current.addMessage(savedMessage);
            setMessageRepo(messageRepoRef.current.getMessages());
            setText('');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
            Alert.alert('Error', errorMessage);
            console.error('Send message error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBackToBoards = () => {
        router.back();
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ThemedView style={styles.header}>
                    <Pressable onPress={handleBackToBoards} style={({ pressed }) => [
                        styles.backButton,
                        pressed && { opacity: 0.6 }
                    ]}>
                        <ThemedText>{'\u2190 Back'}</ThemedText>
                    </Pressable>
                    <ThemedText type="title" style={styles.boardTitle}>Board #{boardId}</ThemedText>
                </ThemedView>

                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messageScroll}
                    contentContainerStyle={styles.messageList}
                    onContentSizeChange={() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                    }}
                >
                    {messageRepo.length === 0 ? (
                        <ThemedView style={styles.emptyContainer}>
                            <ThemedText style={styles.emptyText}>No messages yet</ThemedText>
                        </ThemedView>
                    ) : (
                        messageRepo.map((message, index) => (
                            <MessageBox
                                key={index}
                                sender={message.fromusername}
                                message={message.content}
                                timestamp={message.timestamp}
                                isSentByCurrentUser={message.fromusername === userName}
                            />
                        ))
                    )}
                </ScrollView>

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

                    <Pressable
                        onPress={handleSendMessage}
                        disabled={loading || !text.trim()}
                        style={({ pressed }) => [
                            styles.sendButton,
                            pressed && { opacity: 0.6 },
                            (loading || !text.trim()) && { opacity: 0.4 }
                        ]}
                    >
                                    
                        <SendMessageButton
                        text={text}
                        from_user="current_user"
                        boardId={1}
                        onSendMessage={handleSendMessage}
                        />
                        <ThemedText style={styles.sendButtonText}>Send</ThemedText>
                    </Pressable>
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
        paddingVertical: Spacing.two,
        borderBottomWidth: 1,
        borderBottomColor: '#40404080',
        marginBottom: Spacing.three,
    },

    backButton: {
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.one,
    },

    boardTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
    },

    messageScroll: {
        flex: 1,
    },

    messageList: {
        paddingTop: Spacing.four,
        paddingBottom: Spacing.two,
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

    sendButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.two,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 48,
        minWidth: 60,
    },

    sendButtonText: {
        color: '#ffffff',
        fontWeight: '600',
    },
});
