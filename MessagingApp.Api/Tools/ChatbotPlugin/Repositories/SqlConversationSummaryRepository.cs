using Microsoft.EntityFrameworkCore;

public sealed class SqlConversationSummaryRepository : IConversationSummaryRepository
{
    private readonly IDbContextFactory<MessagingAppDbContext> dbContextFactory;

    public SqlConversationSummaryRepository(
        IDbContextFactory<MessagingAppDbContext> dbContextFactory)
    {
        this.dbContextFactory = dbContextFactory;
    }

    public async Task<ConversationSummary?> GetSummaryAsync(string conversationId)
    {
        if (string.IsNullOrWhiteSpace(conversationId))
        {
            return null;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var record = await dbContext.ConversationSummaries
            .AsNoTracking()
            .FirstOrDefaultAsync(summary => summary.ConversationId == conversationId);

        return record == null ? null : CreateConversationSummary(record);
    }

    public async Task UpsertSummaryAsync(ConversationSummary summary)
    {
        if (summary == null || string.IsNullOrWhiteSpace(summary.ConversationId))
        {
            return;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var existingSummary = await dbContext.ConversationSummaries
            .FirstOrDefaultAsync(record => record.ConversationId == summary.ConversationId);

        if (existingSummary == null)
        {
            dbContext.ConversationSummaries.Add(new ConversationSummaryRecord
            {
                ConversationId = summary.ConversationId,
                SummaryText = summary.SummaryText,
                SummaryThroughMessageId = summary.SummaryThroughMessageId,
                UpdatedAtUtc = summary.UpdatedAt.UtcDateTime
            });
        }
        else
        {
            existingSummary.SummaryText = summary.SummaryText;
            existingSummary.SummaryThroughMessageId = summary.SummaryThroughMessageId;
            existingSummary.UpdatedAtUtc = summary.UpdatedAt.UtcDateTime;
        }

        await dbContext.SaveChangesAsync();
    }

    private static ConversationSummary CreateConversationSummary(
        ConversationSummaryRecord record)
    {
        return new ConversationSummary(
            record.ConversationId,
            record.SummaryText,
            record.SummaryThroughMessageId,
            new DateTimeOffset(
                DateTime.SpecifyKind(record.UpdatedAtUtc, DateTimeKind.Utc)));
    }
}
