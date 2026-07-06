public interface IMessageBoardServices
{
    Task<List<MessageBoardDataResponse>> GetMessageBoardsAsync(string uniqueId);
    Task<MessageBoardDataResponse?> GetMessageBoardByIdAsync(int boardId, string uniqueId);
    Task<MessageBoardDataResponse?> CreateMessageBoardAsync(
        string uniqueId,
        string boardName,
        bool visibleToPublic,
        bool passwordProtected,
        string password);
    Task<List<string>> GetPublicBoardNames();
    Task<bool> AddFavoriteBoardAsync(int boardId, string uniqueId);
    Task<bool> RemoveFavoriteBoardAsync(int boardId, string uniqueId);
}
