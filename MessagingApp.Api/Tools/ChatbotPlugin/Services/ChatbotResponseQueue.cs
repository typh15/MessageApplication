using System.Threading.Channels;

public sealed class ChatbotResponseQueue : BackgroundService, IChatbotResponseQueue
{
    private readonly Channel<ChatbotMessageWorkItem> queue =
        Channel.CreateUnbounded<ChatbotMessageWorkItem>();

    private readonly IChatbotResponseService chatbotResponseService;
    private readonly ILogger<ChatbotResponseQueue> logger;

    public ChatbotResponseQueue(
        IChatbotResponseService chatbotResponseService,
        ILogger<ChatbotResponseQueue> logger)
    {
        this.chatbotResponseService = chatbotResponseService;
        this.logger = logger;
    }

    public void QueueResponse(
        int boardId,
        int messageId,
        string senderUniqueId,
        string? publicImageBaseUrl = null)
    {
        if (string.IsNullOrWhiteSpace(senderUniqueId))
        {
            return;
        }

        var queued = queue.Writer.TryWrite(
            new ChatbotMessageWorkItem(
                boardId,
                messageId,
                senderUniqueId,
                publicImageBaseUrl));

        if (!queued)
        {
            logger.LogWarning(
                "Unable to queue chatbot response for board {BoardId}, message {MessageId}.",
                boardId,
                messageId);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var workItem in queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await chatbotResponseService.TryRespondAsync(workItem, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                logger.LogWarning(
                    ex,
                    "Chatbot response work failed for board {BoardId}, message {MessageId}.",
                    workItem.BoardId,
                    workItem.MessageId);
            }
        }
    }
}
