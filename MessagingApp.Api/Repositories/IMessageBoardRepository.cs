public interface IMessageBoardRepository
{
    int GetNextBoardId();
    Task<MessageBoard?> CreateMessageBoardAsync(string boardName, bool visibleToPublic, bool passwordProtected, string password);
    Task<List<MessageBoard>> GetMessageBoardsAsync();


    int GetNextMessageId(int boardid);
    Task<MessageBoard?> GetMessageBoardByIdAsync(int boardid);
    Task<ChatMessage?> GetMessageByIdAsync(int boardid, int id);
    Task<bool> AddMessageToBoardAsync(int boardid, ChatMessage chatMessage);
    Task<bool> UpdateBoardNameAsync(int boardid, string newName);
    Task<bool> DeleteMessageBoardAsync(int boardid);
    Task<bool> AddUserToBoardAsync(int boardid, ActiveUser user);
    Task<bool> RemoveUserFromBoardAsync(int boardid, ActiveUser user);
    Task<bool> DeleteMessageAsync(int boardid, int messageid);
    Task<bool> CheckUserInBoardAsync(int boardid, ActiveUser user);
    Task<bool> CheckBoardPasswordAsync(int boardid, string password);
    Task<bool> UpdateMostRecentMessageHashAsync(int boardid, int newHash);
    // helpers
}