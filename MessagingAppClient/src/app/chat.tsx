import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRef, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

import { MessageBox } from '@/components/ui/message-box';
import { Button } from '@/components/ui/Button';
import Message_Repo from '@/MessageRepository';
import Message_Class from '@/components/Models/Message_Class';
import * as APIHandler from '@/ApiHandler';
import { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';

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
    const [boardTitle, setBoardTitle] = useState(`Board ${boardId}`);
    const [uniqueBoardId, setUniqueBoardId] = useState<string | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    const theme = useTheme();

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
    const loadBoardTitle = async () => {
        try {
            var flexable_uniqueId = await AsyncStorage.getItem('uniqueid');
            if (flexable_uniqueId == null){
                flexable_uniqueId = "";
            }
            const boardInfo = await APIHandler.getMessageBoardData(flexable_uniqueId, boardId);
            setBoardTitle(boardInfo.boardName);
            setUniqueBoardId(boardInfo.uniqueBoardId ?? null);
        } catch (err) {
            console.error('Failed to load board title:', err);
        }
    };

    const loadMessages = async () => {
        if (!rawBoardId || isNaN(boardId)) {
            // invalid boardId — go back to boards
            router.replace('../boards');
            return;
        }

        try {
            var flexable_uniqueId = await AsyncStorage.getItem('uniqueid');
            if (flexable_uniqueId == null){
                flexable_uniqueId = "";
            }
            const msgs = await APIHandler.fetchMessages(boardId, flexable_uniqueId);
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
        loadBoardTitle();
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

    const handleNewUserRequest = async () => {
        router.push({
            pathname: '../approval-requests',
            params: { boardId: boardId.toString() }
        });
    }

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
                    <Button
                        showText={true}
                        buttonText={'Join Requests'}
                        onPress={handleNewUserRequest}
                        style={styles.backButton}
                        borderWidth={2}
                        backgroundColor={theme.buttonBackground}
                        borderColor={theme.genericborder}
                        borderRadius={8}
                
                    />
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

                    <Button
                        showText={false}
                        showImage={true}
                        imageSource={require("../../assets/images/SendButton.png")}
                        onPress={handleSendMessage}
                        disabled={loading || text.trim().length === 0}
                        width = {48}
                        height = {48}
                        borderRadius = {8}
                        imageWidth = {24}
                        imageHeight = {24}
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
