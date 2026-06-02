import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRef, useEffect, useState } from 'react';
import { Platform, Pressable, Image, ScrollView, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/GenericComponents/themed-text';
import { ThemedView } from '@/components/GenericComponents/themed-view';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

import { MessageBox } from '@/components/ui/message-box';
import { SendMessageButton } from '@/components/ui/sendmessage-button';
import {fetchMessages} from '../ApiHandler';
import Message_Repo from '../MessageRepository';
import Message_Class from '../components/Models/Message_Class';

import * as APIHandler from '../ApiHandler';


const update_interval = 1; // Update every ___ seconds


export default function HomeScreen() {
    const messageRepoRef = useRef(new Message_Repo());
    const [text, setText] = useState('');
    const [messageRepo, setMessageRepo] = useState<Message_Class[]>([]);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {}, []);

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
        }, [messageRepo]);

    async function handleSendMessage(text: string, from_user: string, to_user: string) {
        const savedMessage = await APIHandler.sendMessage(text, from_user, to_user);

        messageRepoRef.current.addMessage(savedMessage);

        setMessageRepo(messageRepoRef.current.getMessages());
        setText('');
    };

    /*
    useEffect(() => {

        const intervalId = setInterval(() => {
            APIHandler.fetchMessages();
        }, update_interval * 1000);

        return () => clearInterval(intervalId);
    }, [APIHandler.fetchMessages()]);
        */
    return (
    <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>

        <ScrollView
            ref={scrollViewRef}
            style={styles.messageScroll}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }}
            >
            {messageRepo.map((message, index) => (
                <MessageBox
                key={index}
                sender={message.fromusername}
                message={message.content}
                timestamp={message.timestamp}
                isSentByCurrentUser={message.fromusername === "current_user"}
                />
            ))}
        </ScrollView>

        <ThemedView style={styles.composer}>
            <TextInput
            style={styles.messageInput}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#8E95A8"
            multiline
            />

            <SendMessageButton
            text={text}
            from_user="current_user"
            to_user="recipient_user"
            onSendMessage={handleSendMessage}
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

messageScroll: {
  flex: 1,
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


  messageList: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
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