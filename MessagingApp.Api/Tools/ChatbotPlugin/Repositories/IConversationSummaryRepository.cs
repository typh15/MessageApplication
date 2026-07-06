public interface IConversationSummaryRepository
{
    Task<ConversationSummary?> GetSummaryAsync(string conversationId);
    Task UpsertSummaryAsync(ConversationSummary summary);
}
