public class MessageServices : IMessageServices
{
    private const int MessagePersistAttemptCount = 3;
    private static readonly TimeSpan DuplicateSendWindow = TimeSpan.FromSeconds(5);

    private readonly IMessageBoardRepository messageBoardRepository;
    private readonly IActiveUserRepository activeUserRepository;
    private readonly IImageServices imageServices;
    private readonly IUserAccountRepository userAccountRepository;
    private readonly IPushNotificationServices pushNotificationServices;
    private readonly IChatbotResponseQueue chatbotResponseQueue;
    private readonly IMessageNotificationServices messageNotificationServices;
    private readonly ILogger<MessageServices> logger;

    public MessageServices(
        IMessageBoardRepository messageBoardRepository,
        IActiveUserRepository activeUserRepository,
        IImageServices imageServices,
        IUserAccountRepository userAccountRepository,
        IPushNotificationServices pushNotificationServices,
        IChatbotResponseQueue chatbotResponseQueue,
        IMessageNotificationServices messageNotificationServices,
        ILogger<MessageServices> logger)
    {
        this.messageBoardRepository = messageBoardRepository;
        this.activeUserRepository = activeUserRepository;
        this.imageServices = imageServices;
        this.userAccountRepository = userAccountRepository;
        this.pushNotificationServices = pushNotificationServices;
        this.chatbotResponseQueue = chatbotResponseQueue;
        this.messageNotificationServices = messageNotificationServices;
        this.logger = logger;
    }

    public async Task<List<ChatMessage>> GetMessagesForBoardAsync(int boardId)
    {
        // TODO(service-split): Message read access is currently enforced by
        // MessagesController calling GetMessageBoardByIdAsync(boardId, uniqueId)
        // before this method. When this can safely change, accept uniqueId
        // here and keep the active-user/board-membership check inside the message service.
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);

        if (board == null)
        {
            return new List<ChatMessage>();
        }

        return board.ChatMessages.ToList();
    }

    public async Task<SendMessageServiceResult> SendMessageToBoardAsync(
        int boardId,
        CreateChatMessageRequest request,
        string userAddress)
    {
        var uniqueId = request.UniqueId ?? string.Empty;
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);
        var userAccount = await userAccountRepository.GetUserAccountAsync(uniqueId);
        var activeUser = await activeUserRepository.GetActiveUserByUniqueId(uniqueId);
        var displayName = userAccount?.DisplayName ?? string.Empty;

        if (board == null)
        {
            return RejectSendMessage(
                boardId,
                uniqueId,
                SendMessageFailureReason.BoardNotFound,
                $"Message board {boardId} was not found.");
        }

        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return RejectSendMessage(
                boardId,
                uniqueId,
                SendMessageFailureReason.MissingUniqueId,
                "A valid session is required to send messages.");
        }

        var isUserActive = await activeUserRepository.IsUserActiveAsync(uniqueId);

        if (!isUserActive)
        {
            return RejectSendMessage(
                boardId,
                uniqueId,
                SendMessageFailureReason.InactiveUser,
                "The current session is no longer active.");
        }

        if (activeUser == null)
        {
            return RejectSendMessage(
                boardId,
                uniqueId,
                SendMessageFailureReason.ActiveUserNotFound,
                "The current user could not be found.");
        }

        activeUser.LastActiveTime = DateTime.UtcNow;
        activeUser.Address = userAddress;
        await activeUserRepository.UpdateActiveUserAsync(activeUser);

        var userIsAlreadyInBoard =
            await messageBoardRepository.CheckUserInBoardAsync(boardId, activeUser);

        if (!userIsAlreadyInBoard)
        {
            return RejectSendMessage(
                boardId,
                uniqueId,
                SendMessageFailureReason.NotBoardMember,
                "You are not a member of this board.");
        }

        if (request.MessageType == MessageTypeEnum.image)
        {
            if (string.IsNullOrWhiteSpace(request.ImageId))
            {
                return RejectSendMessage(
                    boardId,
                    uniqueId,
                    SendMessageFailureReason.MissingImageId,
                    "Image messages require an uploaded image ID.");
            }

            var image = await imageServices.GetImageAsync(request.ImageId);

            if (image == null)
            {
                return RejectSendMessage(
                    boardId,
                    uniqueId,
                    SendMessageFailureReason.ImageNotFound,
                    "The uploaded image could not be found.");
            }

            if (image.OwnerUniqueId != uniqueId)
            {
                return RejectSendMessage(
                    boardId,
                    uniqueId,
                    SendMessageFailureReason.ImageOwnerMismatch,
                    "The uploaded image belongs to a different user.");
            }
        }

        if (request.MessageType == MessageTypeEnum.text)
        {
            request.ImageId = null;
        }

        request.Content ??= string.Empty;

        var duplicateMessage = FindRecentDuplicateMessage(board, activeUser.UserName, request);
        if (duplicateMessage != null)
        {
            logger.LogWarning(
                "Duplicate send suppressed for board {BoardId}, message {MessageId}, user {UniqueId}.",
                boardId,
                duplicateMessage.Id,
                uniqueId);

            return SendMessageServiceResult.Success(
                new SendMessageResponse(uniqueId, duplicateMessage));
        }

        for (var attempt = 1; attempt <= MessagePersistAttemptCount; attempt++)
        {
            var appendResult = await messageBoardRepository.AppendMessageToBoardAsync(
                boardId,
                activeUser.UserName,
                displayName,
                request.LocalTimestamp,
                DateTime.UtcNow,
                request.Content,
                request.MessageType,
                request.ImageId);

            if (appendResult.Succeeded)
            {
                var chatMessage = appendResult.Message!;

                await TrySendMessagePushNotificationAsync(
                    board,
                    chatMessage,
                    uniqueId);

                TryQueueChatbotResponse(boardId, chatMessage.Id, uniqueId);

                return SendMessageServiceResult.Success(
                    new SendMessageResponse(uniqueId, chatMessage));
            }

            if (appendResult.FailureReason == AppendMessageToBoardFailureReason.BoardNotFound)
            {
                return RejectSendMessage(
                    boardId,
                    uniqueId,
                    SendMessageFailureReason.BoardNotFound,
                    $"Message board {boardId} was not found.");
            }

            var refreshedBoard = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);
            if (refreshedBoard != null)
            {
                var persistedDuplicate = FindRecentDuplicateMessage(
                    refreshedBoard,
                    activeUser.UserName,
                    request);

                if (persistedDuplicate != null)
                {
                    logger.LogWarning(
                        "Duplicate send resolved after repository add failure for board {BoardId}, message {MessageId}, user {UniqueId}.",
                        boardId,
                        persistedDuplicate.Id,
                        uniqueId);

                    return SendMessageServiceResult.Success(
                        new SendMessageResponse(uniqueId, persistedDuplicate));
                }
            }

            logger.LogWarning(
                "Send message persistence attempt {Attempt} failed for board {BoardId}, user {UniqueId}. Reason {Reason}. Detail: {FailureMessage}",
                attempt,
                boardId,
                uniqueId,
                appendResult.FailureReason,
                appendResult.FailureMessage);
        }

        logger.LogError(
            "Send message failed after {AttemptCount} persistence attempts for board {BoardId}, user {UniqueId}.",
            MessagePersistAttemptCount,
            boardId,
            uniqueId);

        return SendMessageServiceResult.Failure(
            SendMessageFailureReason.PersistenceFailed,
            "Unable to persist the message.");
    }

    public async Task<bool> DeleteMessageAsync(string uniqueId, int boardId, int messageId)
    {
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);
        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var activeUser = activeUsers.FirstOrDefault(user => user.UniqueId == uniqueId);
        var message = await messageBoardRepository.GetMessageByIdAsync(boardId, messageId);

        if (board == null || message == null || activeUser == null)
        {
            return false;
        }

        var userIsInBoard = await messageBoardRepository.CheckUserInBoardAsync(boardId, activeUser);

        if (userIsInBoard && message.FromUserName == activeUser.UserName)
        {
            return await messageBoardRepository.DeleteMessageAsync(boardId, messageId);
        }

        return false;
    }

    private SendMessageServiceResult RejectSendMessage(
        int boardId,
        string uniqueId,
        SendMessageFailureReason reason,
        string message)
    {
        logger.LogWarning(
            "Send message rejected. Reason {Reason}. Board {BoardId}. User {UniqueId}.",
            reason,
            boardId,
            string.IsNullOrWhiteSpace(uniqueId) ? "(missing)" : uniqueId);

        return SendMessageServiceResult.Failure(reason, message);
    }

    private static ChatMessage? FindRecentDuplicateMessage(
        MessageBoard board,
        string senderUserName,
        CreateChatMessageRequest request)
    {
        var duplicateWindowStart = DateTime.UtcNow.Subtract(DuplicateSendWindow);

        return board.ChatMessages
            .Where(message => message.ServerTimestamp >= duplicateWindowStart)
            .Where(message => string.Equals(
                message.FromUserName,
                senderUserName,
                StringComparison.Ordinal))
            .Where(message => message.MessageType == request.MessageType)
            .Where(message => string.Equals(
                message.Content ?? string.Empty,
                request.Content ?? string.Empty,
                StringComparison.Ordinal))
            .Where(message => string.Equals(
                message.ImageId ?? string.Empty,
                request.ImageId ?? string.Empty,
                StringComparison.Ordinal))
            .OrderByDescending(message => message.ServerTimestamp)
            .ThenByDescending(message => message.Id)
            .FirstOrDefault();
    }

    private async Task TrySendMessagePushNotificationAsync(
        MessageBoard board,
        ChatMessage chatMessage,
        string senderUniqueId)
    {
        try
        {
            var result = await pushNotificationServices.SendAsync(
                messageNotificationServices.CreateMessagePushNotificationRequest(
                    board,
                    chatMessage,
                    senderUniqueId));

            if (!result.AcceptedByPushService)
            {
                logger.LogWarning(
                    "Push notification send failed for board {BoardId}, message {MessageId}. Requested {RequestedRecipientCount}, subscriptions {SubscriptionCount}, sent {SentCount}. Error: {ErrorMessage}",
                    board.BoardId,
                    chatMessage.Id,
                    result.RequestedRecipientCount,
                    result.SubscriptionCount,
                    result.SentCount,
                    result.ErrorMessage);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Push notification side effect failed for board {BoardId}, message {MessageId}. Message was already saved.",
                board.BoardId,
                chatMessage.Id);
        }
    }

    private void TryQueueChatbotResponse(int boardId, int messageId, string senderUniqueId)
    {
        try
        {
            chatbotResponseQueue.QueueResponse(boardId, messageId, senderUniqueId);
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Chatbot queue side effect failed for board {BoardId}, message {MessageId}. Message was already saved.",
                boardId,
                messageId);
        }
    }
}
