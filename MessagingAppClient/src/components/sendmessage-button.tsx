import { Pressable, Image } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';    
import {sendMessage} from '../ApiHandler';



type SendButtonProps = {
  text: string;
  onSendMessage: (messageText: string) => void;
};

export function SendMessageButton({text, onSendMessage}: SendButtonProps) {
    return (
        <Pressable onPress={() => onSendMessage(text)}>
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
    );
}


