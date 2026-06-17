import { Image } from 'expo-image';
import { View, StyleSheet } from 'react-native';

import { getImageUrl } from '@/APIHandlers/ApiHandlerHub';
import { ThemedText } from '../GenericComponents/themed-text';

import { Spacing } from '@/constants/theme';

type MessageBoxProps = {
    sender: string;
    message: string;
    timestamp: string;
    isSentByCurrentUser: boolean;
    messageType?: 'text' | 'image';
    imageId?: string;
};
export function MessageBox({
    sender,
    message,
    timestamp,
    isSentByCurrentUser,
    messageType = 'text',
    imageId,
}: MessageBoxProps) {
    const date = new Date(timestamp);
    const formattedDate = new Intl.DateTimeFormat("en-US").format(date);
    const formattedTime = date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit", });

    const formattedDateTime = `${formattedTime} \u00B7 ${formattedDate}`;
    const isImageMessage = messageType === 'image';
    const trimmedMessage = message.trim();

    return (
        <View style={[
            styles.messageContainer,
            isImageMessage && styles.imageMessageContainer,
            isSentByCurrentUser ? styles.sentMessage : styles.receivedMessage,
        ]}>
            <View style={styles.messageHeader}>
                <ThemedText style={styles.sender} numberOfLines={1}>
                    {sender}
                </ThemedText>

                <ThemedText style={styles.timestamp} numberOfLines={1}>
                    {formattedDateTime}
                </ThemedText>
            </View>

            {isImageMessage && imageId ? (
                <Image
                    source={{ uri: getImageUrl(imageId) }}
                    style={styles.messageImage}
                    contentFit="cover"
                    transition={120}
                    accessibilityLabel={trimmedMessage || 'Picture message'}
                />
            ) : null}

            {isImageMessage && !imageId ? (
                <ThemedText style={styles.unavailableImageText}>
                    Image unavailable
                </ThemedText>
            ) : null}

            {trimmedMessage ? (
                <ThemedText style={[styles.message, isImageMessage && styles.imageCaption]}>
                    {trimmedMessage}
                </ThemedText>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    messageContainer: {
        maxWidth: "84%",
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        borderRadius: 18,
    },

    imageMessageContainer: {
        width: 296,
    },

    sentMessage: {
        alignSelf: "flex-end",
        backgroundColor: "#3540A8",
        borderBottomRightRadius: 6,
    },

    receivedMessage: {
        alignSelf: "flex-start",
        backgroundColor: "#2E3135",
        borderBottomLeftRadius: 6,
    },

    messageHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.two,
        marginBottom: Spacing.half,
    },

    sender: {
        flexShrink: 1,
        fontWeight: "700",
        fontSize: 13,
        color: "#FFFFFF",
    },

    timestamp: {
        fontSize: 11,
        color: "#B0B4BA",
    },

    message: {
        fontSize: 17,
        lineHeight: 22,
        color: "#FFFFFF",
    },

    imageCaption: {
        marginTop: Spacing.two,
    },

    messageImage: {
        width: "100%",
        height: 220,
        borderRadius: 12,
        backgroundColor: "#151923",
    },

    unavailableImageText: {
        color: "#E5E8F2",
        fontSize: 15,
        opacity: 0.82,
    },
});
