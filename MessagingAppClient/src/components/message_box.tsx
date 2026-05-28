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
export function MessageBox({
  sender,
  message,
  timestamp,
  isSentByCurrentUser,
}: MessageBoxProps) {
  const date = new Date(timestamp);
  const formattedDate = new Intl.DateTimeFormat("en-US").format(date);
  const formattedTime = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedDateTime = `${formattedTime} · ${formattedDate}`;

  return (
    <View
      style={[
        styles.messageContainer,
        isSentByCurrentUser ? styles.sentMessage : styles.receivedMessage,
      ]}
    >
      <View style={styles.messageHeader}>
        <ThemedText style={styles.sender} numberOfLines={1}>
          {sender}
        </ThemedText>

        <ThemedText style={styles.timestamp} numberOfLines={1}>
          {formattedDateTime}
        </ThemedText>
      </View>

      <ThemedText style={styles.message}>
        {message}
      </ThemedText>
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
});