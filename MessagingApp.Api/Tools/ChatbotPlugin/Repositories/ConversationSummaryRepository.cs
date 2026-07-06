public sealed class ConversationSummaryRepository : IConversationSummaryRepository
{
    private readonly Dictionary<string, ConversationSummary> summaries =
        new(StringComparer.Ordinal);

    public Task<ConversationSummary?> GetSummaryAsync(string conversationId)
    {
        if (string.IsNullOrWhiteSpace(conversationId))
        {
            return Task.FromResult<ConversationSummary?>(null);
        }

        lock (summaries)
        {
            return Task.FromResult(
                summaries.TryGetValue(conversationId, out var summary)
                    ? Clone(summary)
                    : null);
        }
    }

    public Task UpsertSummaryAsync(ConversationSummary summary)
    {
        if (summary == null || string.IsNullOrWhiteSpace(summary.ConversationId))
        {
            return Task.CompletedTask;
        }

        lock (summaries)
        {
            summaries[summary.ConversationId] = Clone(summary);
        }

        return Task.CompletedTask;
    }

    private static ConversationSummary Clone(ConversationSummary summary)
    {
        return new ConversationSummary(
            summary.ConversationId,
            summary.SummaryText,
            summary.SummaryThroughMessageId,
            summary.UpdatedAt);
    }
}
