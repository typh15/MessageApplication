public interface IChatbotClient
{
    Task<ChatbotChatResponse?> SendChatAsync(
        ChatbotChatRequest request,
        CancellationToken cancellationToken = default);

    Task<ChatbotSummaryResponse?> SummarizeAsync(
        ChatbotSummaryRequest request,
        CancellationToken cancellationToken = default);
}
