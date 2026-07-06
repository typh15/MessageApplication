using Microsoft.Extensions.Options;

public sealed class ChatbotResponseService : IChatbotResponseService
{
    private const string UserRole = "user";
    private const string AssistantRole = "assistant";
    private const int SaveBotReplyAttemptCount = 3;

    private readonly IOptions<ChatbotOptions> options;
    private readonly IMessageBoardRepository messageBoardRepository;
    private readonly IConversationSummaryRepository conversationSummaryRepository;
    private readonly IChatbotClient chatbotClient;
    private readonly IChatbotBotUserService chatbotBotUserService;
    private readonly IPushNotificationServices pushNotificationServices;
    private readonly ILogger<ChatbotResponseService> logger;

    public ChatbotResponseService(
        IOptions<ChatbotOptions> options,
        IMessageBoardRepository messageBoardRepository,
        IConversationSummaryRepository conversationSummaryRepository,
        IChatbotClient chatbotClient,
        IChatbotBotUserService chatbotBotUserService,
        IPushNotificationServices pushNotificationServices,
        ILogger<ChatbotResponseService> logger)
    {
        this.options = options;
        this.messageBoardRepository = messageBoardRepository;
        this.conversationSummaryRepository = conversationSummaryRepository;
        this.chatbotClient = chatbotClient;
        this.chatbotBotUserService = chatbotBotUserService;
        this.pushNotificationServices = pushNotificationServices;
        this.logger = logger;
    }

    public async Task TryRespondAsync(
        ChatbotMessageWorkItem workItem,
        CancellationToken cancellationToken = default)
    {
        var chatbotOptions = options.Value;
        if (!chatbotOptions.Enabled ||
            chatbotBotUserService.IsConfiguredBotUniqueId(workItem.SenderUniqueId))
        {
            return;
        }

        var board = await messageBoardRepository.GetMessageBoardByIdAsync(workItem.BoardId);
        if (board == null)
        {
            return;
        }

        var currentMessage = board.ChatMessages
            .FirstOrDefault(message => message.Id == workItem.MessageId);

        if (currentMessage == null || IsBotMessage(currentMessage, chatbotOptions))
        {
            return;
        }

        var botUser = await chatbotBotUserService.EnsureBotUserAsync();
        if (botUser == null)
        {
            return;
        }

        var botIsInBoard = await messageBoardRepository.CheckUserInBoardAsync(
            board.BoardId,
            botUser);

        if (!botIsInBoard)
        {
            return;
        }

        await TrySummarizeIfThresholdAsync(board, chatbotOptions, cancellationToken);

        board = await messageBoardRepository.GetMessageBoardByIdAsync(workItem.BoardId) ?? board;
        currentMessage = board.ChatMessages
            .FirstOrDefault(message => message.Id == workItem.MessageId);

        if (currentMessage == null)
        {
            return;
        }

        var conversationId = CreateConversationId(board.BoardId);
        var storedSummary = await conversationSummaryRepository.GetSummaryAsync(conversationId);
        var chatRequest = CreateChatRequest(
            chatbotOptions,
            board,
            currentMessage,
            workItem.SenderUniqueId,
            storedSummary);

        if (currentMessage.MessageType == MessageTypeEnum.image &&
            !string.IsNullOrWhiteSpace(currentMessage.ImageId) &&
            chatRequest.ImageUrls.Count == 0)
        {
            logger.LogWarning(
                "Chatbot image message {MessageId} on board {BoardId} has no public image URL because Chatbot:PublicImageBaseUrl is not configured.",
                currentMessage.Id,
                board.BoardId);
        }

        if (string.IsNullOrWhiteSpace(chatRequest.Message) &&
            chatRequest.ImageUrls.Count == 0)
        {
            return;
        }

        var chatResponse = await chatbotClient.SendChatAsync(
            chatRequest,
            cancellationToken);

        var reply = chatResponse?.Reply?.Trim();
        if (string.IsNullOrWhiteSpace(reply))
        {
            return;
        }

        var botMessage = await SaveBotReplyAsync(
            board,
            chatbotOptions,
            reply,
            cancellationToken);

        if (botMessage == null)
        {
            return;
        }

        var boardAfterBotReply = await messageBoardRepository.GetMessageBoardByIdAsync(board.BoardId);
        if (boardAfterBotReply != null)
        {
            await TrySummarizeIfThresholdAsync(
                boardAfterBotReply,
                chatbotOptions,
                cancellationToken);
        }
    }

    private ChatbotChatRequest CreateChatRequest(
        ChatbotOptions chatbotOptions,
        MessageBoard board,
        ChatMessage currentMessage,
        string senderUniqueId,
        ConversationSummary? storedSummary)
    {
        return new ChatbotChatRequest
        {
            Message = CreateCurrentMessageText(currentMessage),
            UserId = senderUniqueId,
            ConversationId = CreateConversationId(board.BoardId),
            Summary = CreateChatbotSummary(storedSummary),
            History = CreateRecentHistory(
                board,
                currentMessage.Id,
                chatbotOptions),
            ImageUrls = CreateImageUrls(currentMessage, chatbotOptions)
        };
    }

    private async Task<ChatMessage?> SaveBotReplyAsync(
        MessageBoard board,
        ChatbotOptions chatbotOptions,
        string reply,
        CancellationToken cancellationToken)
    {
        for (var attempt = 1; attempt <= SaveBotReplyAttemptCount; attempt++)
        {
            var botMessage = CreateBotReplyMessage(board.BoardId, chatbotOptions, reply);
            var messageWasAdded = await messageBoardRepository.AddMessageToBoardAsync(
                board.BoardId,
                botMessage);

            if (messageWasAdded)
            {
                await pushNotificationServices.SendAsync(CreateMessagePushNotificationRequest(
                    board,
                    botMessage,
                    chatbotOptions.BotUniqueId));

                return botMessage;
            }

            logger.LogWarning(
                "Unable to save chatbot reply to board {BoardId} on attempt {Attempt} of {AttemptCount}.",
                board.BoardId,
                attempt,
                SaveBotReplyAttemptCount);
        }

        return null;
    }

    private ChatMessage CreateBotReplyMessage(
        int boardId,
        ChatbotOptions chatbotOptions,
        string reply)
    {
        var messageId = messageBoardRepository.GetNextMessageId(boardId);
        var now = DateTime.UtcNow;
        var botMessage = new ChatMessage(
            messageId,
            chatbotOptions.BotUserName.Trim(),
            chatbotOptions.BotUserName.Trim(),
            boardId,
            now,
            now,
            reply,
            MessageTypeEnum.text,
            null);

        botMessage.AssignGlobalId();
        return botMessage;
    }

    private async Task TrySummarizeIfThresholdAsync(
        MessageBoard board,
        ChatbotOptions chatbotOptions,
        CancellationToken cancellationToken)
    {
        if (chatbotOptions.SummarizeEveryMessageCount <= 0 ||
            chatbotOptions.RecentMessageCount < 0)
        {
            return;
        }

        var orderedMessages = board.ChatMessages
            .OrderBy(message => message.Id)
            .ToList();

        if (orderedMessages.Count == 0 ||
            orderedMessages.Count % chatbotOptions.SummarizeEveryMessageCount != 0)
        {
            return;
        }

        var conversationId = CreateConversationId(board.BoardId);
        var existingSummary = await conversationSummaryRepository.GetSummaryAsync(conversationId);
        var existingThroughMessageId = existingSummary?.SummaryThroughMessageId ?? 0;
        var olderMessageCount = Math.Max(
            0,
            orderedMessages.Count - chatbotOptions.RecentMessageCount);

        var messagesToSummarize = orderedMessages
            .Take(olderMessageCount)
            .Where(message => message.Id > existingThroughMessageId)
            .Select(message => CreateConversationMessage(message, chatbotOptions))
            .ToList();

        if (messagesToSummarize.Count == 0)
        {
            return;
        }

        var summaryResponse = await chatbotClient.SummarizeAsync(
            new ChatbotSummaryRequest
            {
                ConversationId = conversationId,
                ExistingSummary = CreateChatbotSummary(existingSummary),
                Messages = messagesToSummarize,
                MaxWords = Math.Max(1, chatbotOptions.SummaryMaxWords)
            },
            cancellationToken);

        var responseSummary = summaryResponse?.Summary;
        if (responseSummary == null ||
            string.IsNullOrWhiteSpace(responseSummary.Text))
        {
            return;
        }

        var fallbackThroughMessageId = messagesToSummarize
            .Max(message => message.MessageId);
        var summaryThroughMessageId = responseSummary.ThroughMessageId > 0
            ? responseSummary.ThroughMessageId
            : fallbackThroughMessageId;

        summaryThroughMessageId = Math.Max(
            existingThroughMessageId,
            summaryThroughMessageId);

        await conversationSummaryRepository.UpsertSummaryAsync(new ConversationSummary(
            conversationId,
            responseSummary.Text,
            summaryThroughMessageId,
            responseSummary.UpdatedAt ?? DateTimeOffset.UtcNow));
    }

    private static ChatbotConversationSummary? CreateChatbotSummary(
        ConversationSummary? summary)
    {
        if (summary == null)
        {
            return null;
        }

        return new ChatbotConversationSummary
        {
            Text = summary.SummaryText,
            ThroughMessageId = summary.SummaryThroughMessageId,
            UpdatedAt = summary.UpdatedAt
        };
    }

    private static List<ChatbotConversationMessage> CreateRecentHistory(
        MessageBoard board,
        int currentMessageId,
        ChatbotOptions chatbotOptions)
    {
        return board.ChatMessages
            .Where(message => message.Id != currentMessageId)
            .OrderByDescending(message => message.Id)
            .Take(Math.Max(0, chatbotOptions.RecentMessageCount))
            .OrderBy(message => message.Id)
            .Select(message => CreateConversationMessage(message, chatbotOptions))
            .ToList();
    }

    private static ChatbotConversationMessage CreateConversationMessage(
        ChatMessage message,
        ChatbotOptions chatbotOptions)
    {
        return new ChatbotConversationMessage
        {
            Role = IsBotMessage(message, chatbotOptions) ? AssistantRole : UserRole,
            Content = CreateHistoryMessageText(message),
            MessageId = message.Id
        };
    }

    private static List<string> CreateImageUrls(
        ChatMessage message,
        ChatbotOptions chatbotOptions)
    {
        if (message.MessageType != MessageTypeEnum.image ||
            string.IsNullOrWhiteSpace(message.ImageId) ||
            string.IsNullOrWhiteSpace(chatbotOptions.PublicImageBaseUrl))
        {
            return [];
        }

        return
        [
            $"{chatbotOptions.PublicImageBaseUrl.TrimEnd('/')}/images/{Uri.EscapeDataString(message.ImageId)}"
        ];
    }

    private static string CreateCurrentMessageText(ChatMessage message)
    {
        if (!string.IsNullOrWhiteSpace(message.Content))
        {
            return message.Content;
        }

        return message.MessageType == MessageTypeEnum.image
            ? "Please respond to this image."
            : string.Empty;
    }

    private static string CreateHistoryMessageText(ChatMessage message)
    {
        if (!string.IsNullOrWhiteSpace(message.Content))
        {
            return message.Content;
        }

        return message.MessageType == MessageTypeEnum.image
            ? "Sent an image."
            : string.Empty;
    }

    private static bool IsBotMessage(
        ChatMessage message,
        ChatbotOptions chatbotOptions)
    {
        return string.Equals(
            message.FromUserName,
            chatbotOptions.BotUserName,
            StringComparison.OrdinalIgnoreCase);
    }

    private static string CreateConversationId(int boardId)
    {
        return $"board-{boardId}";
    }

    private static PushNotificationSendRequest CreateMessagePushNotificationRequest(
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
