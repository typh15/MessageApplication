import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Image, ScrollView, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { HintRow } from '@/components/hint-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { MessageBox } from '@/components/message_box';



const serverUrl = 'http://100.90.53.59:5121';
const connectionNodeName = 'chat-hub';
const defaultNodeName = 'chat-messages';



function sendMessage(text:string) {
    console.log("Sending message:", text);
    fetch(`${serverUrl}/${defaultNodeName}`, {
        method: 'POST',
        headers: {
            
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({id: 0, fromusername: 'current_user', tousername: 'recipient_user', timestamp: 0, content: text}),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
    })
    .then(data => {
        console.log('Message sent successfully:', data);
    })
    .catch((error) => {
        console.error('Error sending message:', error);
    });
    // Here you would typically send the message to your backend or update your state
}

export default function HomeScreen() {
    const [text, setText] = useState('');
    const [messages, setMessages] = useState<Array<{id: number, fromusername: string, tousername: string, timestamp: number, content: string}>>([]);
    useEffect(() => {}, [messages]);
    
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
        <ThemedView type="backgroundSelected" style={styles.sendContainer}>
        <Pressable onPress={() => sendMessage(text)}>
            <ThemedView style={{alignItems: 'center', padding: Spacing.two, backgroundColor: '#2E3135', borderRadius: Spacing.two, flexDirection: 'row', gap: Spacing.two}}>
            <ThemedText>Send</ThemedText>
            
            <Image
                source={require("../../assets/images/SendButton.png")}
                style={{
                    width: 28,
                    height: 28,
                }}
            />
            </ThemedView>
        </Pressable>
        </ThemedView>

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
