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
    
        
    const date = new Date(timestamp);
    const formattedDate = new Intl.DateTimeFormat('en-US').format(date);
    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDateTime = `${formattedTime} -   ${formattedDate}`;
    
    return (
        <View style={[styles.messageContainer, isSentByCurrentUser ? styles.sentMessage : styles.receivedMessage]}>
            <View style={styles.messageHeader}>
                <ThemedText style={styles.sender}>{sender}</ThemedText>
                <ThemedText style={styles.sender}>{'                      '}</ThemedText>
                <ThemedText style={styles.timestamp}>{formattedDateTime}</ThemedText>
            </View>
            <ThemedText style={styles.message}>{message}</ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    messageContainer: {           
        padding: Spacing.two,

    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.half,
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
        textAlign: 'left',
    },
    message: {
        marginBottom: Spacing.half, 
    },
    timestamp: {
        fontSize: 12,   
        color: '#B0B4BA',
        alignSelf: 'flex-end',
        textAlign: 'right',
    },
});