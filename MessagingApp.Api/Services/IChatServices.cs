public interface IChatService
{
    Task<List<MessageBoard>> GetMessageBoardsAsync();

    Task<MessageBoard?> GetMessageBoardByIdAsync(int boardId);

    Task<MessageBoard?> CreateMessageBoardAsync(
        string boardName,
        bool visibleToPublic,
        bool passwordProtected,
        string password
    );

    Task<List<ChatMessage>> GetMessagesForBoardAsync(int boardId);

    Task<SendMessageResponse?> SendMessageToBoardAsync(
        int boardId,
        CreateChatMessageRequest request,
        string userAddress
    );

    Task<bool> DeleteMessageAsync(int boardId, int messageId);
}