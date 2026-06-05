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
    Task<List<ActiveUser>> GetAllActiveUsersAsync();

    Task<CreateActiveUserResponse?> CreateActiveUserAsync(
        string userName,
        string userAddress
    );

    Task<SendMessageResponse?> SendMessageToBoardAsync(
        int boardId,
        CreateChatMessageRequest request,
        string userAddress
    );

    Task<bool> JoinBoardAsync(int boardId, string uniqueId, string userAddress);

    Task<bool> DeleteMessageAsync(int boardId, int messageId);
}