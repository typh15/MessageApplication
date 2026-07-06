public interface IChatbotResponseService
{
    Task TryRespondAsync(
        ChatbotMessageWorkItem workItem,
        CancellationToken cancellationToken = default);
}
