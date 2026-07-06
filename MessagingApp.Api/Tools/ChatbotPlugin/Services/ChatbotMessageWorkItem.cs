public sealed class ChatbotMessageWorkItem
{
    public int BoardId { get; }
    public int MessageId { get; }
    public string SenderUniqueId { get; }

    public ChatbotMessageWorkItem(int boardId, int messageId, string senderUniqueId)
    {
        BoardId = boardId;
        MessageId = messageId;
        SenderUniqueId = senderUniqueId;
    }
}
