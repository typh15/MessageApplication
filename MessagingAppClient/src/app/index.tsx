import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRef, useEffect, useState } from 'react';
import { Platform, Pressable, Image, ScrollView, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

import { MessageBox } from '@/components/message_box';
import { SendMessageButton } from '@/components/sendmessage-button';
import messageData from '../../assets/data/messages.json';
import {fetchMessages} from '../ApiHandler';
import Message_Repo from '../components/Message_Repo';
import Message_Class from '../components/Message_Class';

import * as APIHandler from '../ApiHandler';





export default function HomeScreen() {
    const messageRepoRef = useRef(new Message_Repo());
    const [text, setText] = useState('');
    const [messageRepo, setMessageRepo] = useState<Message_Class[]>([]);

    useEffect(() => {}, []);

    async function handleSendMessage(text: string) {
        const savedMessage = await APIHandler.sendMessage(text);

        messageRepoRef.current.addMessage(savedMessage);

        setMessageRepo(messageRepoRef.current.getMessages());
        console.log("Number of messages in repo:", messageRepoRef.current.getMessages().length);
    };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>

        <ThemedView type="backgroundElement" style={styles.stepContainer}>
            
                <TextInput
                    style={styles.MessageInput}
                    value={text}
                    onChangeText={(text:string) => setText(text)}
                    placeholder="Type a message..."
                    multiline={true}
                    textAlign = "left"

                />
                
        </ThemedView>

        <SendMessageButton text={text} onSendMessage={handleSendMessage} />

        <ScrollView style={{marginTop: Spacing.two }} contentContainerStyle={{gap: Spacing.two}}>
            {messageRepo.map((message, index) => (
                <MessageBox
                    key={index}
                    sender={message.fromusername}
                    message={message.content}
                    timestamp={message.timestamp}
                    isSentByCurrentUser={message.fromusername === 'current_user'}
                />
            ))}
        </ScrollView>

      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 150,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    top: 100,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  code: {
    textTransform: 'uppercase',
  },
  stepContainer: {
    gap: Spacing.three,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
  sendContainer: {
    gap: Spacing.one,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
    justifyContent: 'flex-end',
    marginRight: 'auto',
    
  },
  MessageInput: {
    fontSize: 17,
    textAlign: 'center',
    backgroundColor: '#262f4b',
    color: '#ffffff',
    padding: 8,
    borderRadius: 4,
  },
});
