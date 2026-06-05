import { Pressable, Image } from 'react-native';

type SendButtonProps = {
    text: string;
    from_user: string;
    boardId: number;
    onSendMessage: (messageText: string, from_user: string, boardId: number) => void;
};

export function SendMessageButton({ text, from_user, boardId, onSendMessage }: SendButtonProps) {
    const isDisabled = text.trim().length === 0;

    return (
        <Pressable onPress={() => { if (!isDisabled) { onSendMessage(text, from_user, boardId); }}}
            disabled={isDisabled}
            style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: isDisabled ? "#303342" : "#4A5CFF",
                alignItems: "center",
                justifyContent: "center",
                opacity: isDisabled ? 0.45 : pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
            })} >
            <Image source={require("../../../assets/images/SendButton.png")}
                    style={{ width: 24, height: 24, }} />
        </Pressable>
    );
}
