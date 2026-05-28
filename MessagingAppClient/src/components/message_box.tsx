import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';

type MessageBoxProps = {
    sender: string;
    message: string;
    timestamp: string;
    isSentByCurrentUser: boolean;
};

export function MessageBox({ sender, message, timestamp, isSentByCurrentUser }: MessageBoxProps) {
    return (
        <View style={[styles.messageContainer, isSentByCurrentUser ? styles.sentMessage : styles.receivedMessage]}>
            <ThemedText style={styles.sender}>{sender}</ThemedText>
            <ThemedText style={styles.message}>{message}</ThemedText>
            <ThemedText style={styles.timestamp}>{timestamp}</ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    messageContainer: {
        maxWidth: '80%',            
        padding: Spacing.two,

    },
    sentMessage: {
        alignSelf: 'flex-end',                                                                          
        backgroundColor: '#2E3135',
        borderRadius: Spacing.two,  
    },
    receivedMessage: {
        alignSelf: 'flex-start',    
        backgroundColor: '#212225',
        borderRadius: Spacing.two,
    },
    sender: {   
        fontWeight: 'bold',
        marginBottom: Spacing.half,
    },
    message: {
        marginBottom: Spacing.half, 
    },
    timestamp: {
        fontSize: 12,   
        color: '#B0B4BA',
        alignSelf: 'flex-end',
    },
});