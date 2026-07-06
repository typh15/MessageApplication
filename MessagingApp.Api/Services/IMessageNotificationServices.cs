public interface IMessageNotificationServices
{
    PushNotificationSendRequest CreateMessagePushNotificationRequest(
        MessageBoard board,
        ChatMessage chatMessage,
        string senderUniqueId);

    PushNotificationSendRequest CreateBoardInvitePushNotificationRequest(
        MessageBoard board,
        ActiveUser invitedByUser,
        ActiveUser invitedUser);

    PushNotificationSendRequest CreateJoinRequestPushNotificationRequest(
        MessageBoard board,
        ActiveUser requestingUser);
}
