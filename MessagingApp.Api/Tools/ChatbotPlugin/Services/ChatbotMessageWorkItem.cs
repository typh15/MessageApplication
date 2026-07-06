public sealed class ChatbotMessageWorkItem
{
    public int BoardId { get; }
    public int MessageId { get; }
    public string SenderUniqueId { get; }
    public string? PublicImageBaseUrl { get; }

    public ChatbotMessageWorkItem(
        int boardId,
        int messageId,
        string senderUniqueId,
        string? publicImageBaseUrl = null)
    {
        BoardId = boardId;
        MessageId = messageId;
        SenderUniqueId = senderUniqueId;
        PublicImageBaseUrl = publicImageBaseUrl;
    }
}
