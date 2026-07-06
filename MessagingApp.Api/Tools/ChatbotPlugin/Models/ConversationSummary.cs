public sealed class ConversationSummary
{
    public string ConversationId { get; set; }
    public string SummaryText { get; set; }
    public int SummaryThroughMessageId { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ConversationSummary(
        string conversationId,
        string summaryText,
        int summaryThroughMessageId,
        DateTimeOffset updatedAt)
    {
        ConversationId = conversationId;
        SummaryText = summaryText;
        SummaryThroughMessageId = summaryThroughMessageId;
        UpdatedAt = updatedAt;
    }
}
