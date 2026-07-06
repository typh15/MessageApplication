public interface IChatbotResponseQueue
{
    void QueueResponse(int boardId, int messageId, string senderUniqueId);
}
