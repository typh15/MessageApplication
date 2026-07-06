public interface IMessageNotificationServices
{
    PushNotificationSendRequest CreateMessagePushNotificationRequest(
        MessageBoard board,
        ChatMessage chatMessage,
        string senderUniqueId);
}
