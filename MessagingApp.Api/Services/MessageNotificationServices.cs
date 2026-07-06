public class MessageNotificationServices : IMessageNotificationServices
{
    public PushNotificationSendRequest CreateMessagePushNotificationRequest(
        MessageBoard board,
        ChatMessage chatMessage,
        string senderUniqueId)
    {
        var senderName = string.IsNullOrWhiteSpace(chatMessage.FromDisplayName)
            ? chatMessage.FromUserName
            : chatMessage.FromDisplayName;

        var messagePreview = GetMessageNotificationPreview(chatMessage);

        return new PushNotificationSendRequest(
            board.ActiveUsers.Select(user => user.UniqueId ?? string.Empty),
            senderUniqueId,
            $"{senderName} in {board.BoardName}",
            messagePreview,
            new Dictionary<string, object?>
            {
                ["type"] = "message",
                ["boardId"] = board.BoardId,
                ["messageId"] = chatMessage.Id,
                ["url"] = $"/Chat-Page?boardId={board.BoardId}",
            });
    }

    public PushNotificationSendRequest CreateBoardInvitePushNotificationRequest(
        MessageBoard board,
        ActiveUser invitedByUser,
        ActiveUser invitedUser)
    {
        var inviterName = GetUserNotificationName(invitedByUser);

        return new PushNotificationSendRequest(
            [invitedUser.UniqueId ?? string.Empty],
            invitedByUser.UniqueId,
            $"Invite to {board.BoardName}",
            $"{inviterName} invited you to join {board.BoardName}.",
            new Dictionary<string, object?>
            {
                ["type"] = "board_invite",
                ["inviteBoardId"] = board.BoardId,
                ["uniqueBoardId"] = board.UniqueBoardId,
                ["invitedByUserName"] = invitedByUser.UserName,
            });
    }

    public PushNotificationSendRequest CreateJoinRequestPushNotificationRequest(
        MessageBoard board,
        ActiveUser requestingUser)
    {
        var requesterName = GetUserNotificationName(requestingUser);

        return new PushNotificationSendRequest(
            board.ActiveUsers.Select(user => user.UniqueId ?? string.Empty),
            requestingUser.UniqueId,
            $"Join request for {board.BoardName}",
            $"{requesterName} requested to join {board.BoardName}.",
            new Dictionary<string, object?>
            {
                ["type"] = "join_request",
                ["boardId"] = board.BoardId,
                ["requestedUserName"] = requestingUser.UserName,
                ["requestedUserUniqueId"] = requestingUser.UniqueId,
                ["url"] = $"/Chat-Page?boardId={board.BoardId}",
            });
    }

    private static string GetMessageNotificationPreview(ChatMessage chatMessage)
    {
        if (chatMessage.MessageType == MessageTypeEnum.image)
        {
            if (string.IsNullOrWhiteSpace(chatMessage.Content))
            {
                return "Sent a picture";
            }

            return TruncateNotificationText(chatMessage.Content);
        }

        return TruncateNotificationText(chatMessage.Content);
    }

    private static string GetUserNotificationName(ActiveUser activeUser)
    {
        return string.IsNullOrWhiteSpace(activeUser.UserName)
            ? "Someone"
            : activeUser.UserName;
    }

    private static string TruncateNotificationText(string value)
    {
        const int maxLength = 140;

        if (value.Length <= maxLength)
        {
            return value;
        }

        return value.Substring(0, maxLength - 3) + "...";
    }
}
