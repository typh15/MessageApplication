public interface IMessageServices
{
    Task<List<ChatMessage>> GetMessagesForBoardAsync(int boardId);
    Task<SendMessageServiceResult> SendMessageToBoardAsync(
        int boardId,
        CreateChatMessageRequest request,
        string userAddress,
        string? publicImageBaseUrl = null);
    Task<bool> DeleteMessageAsync(string uniqueId, int boardId, int messageId);
}
