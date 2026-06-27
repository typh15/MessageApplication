public class PushNotificationSendRequest
{
    public IEnumerable<string> RecipientUniqueIds { get; }
    public string? SenderUniqueId { get; }
    public string Title { get; }
    public string Body { get; }
    public IReadOnlyDictionary<string, object?>? Data { get; }

    public PushNotificationSendRequest(
        IEnumerable<string> recipientUniqueIds,
        string? senderUniqueId,
        string title,
        string body,
        IReadOnlyDictionary<string, object?>? data = null)
    {
        RecipientUniqueIds = recipientUniqueIds;
        SenderUniqueId = senderUniqueId;
        Title = title;
        Body = body;
        Data = data;
    }
}
