public interface IMessageBoardRepository
{
    Task<List<MessageBoard>> GetMessageBoardsAsync();
    Task<MessageBoard?> GetMessageBoardByIdAsync(int boardid);
    Task<ChatMessage?> GetMessageByIdAsync(int boardid, int id);
    Task<bool> AddMessageToBoardAsync(ChatMessage Message, int boardid);
    Task<bool> UpdateBoardNameAsync(int boardid);
    Task<bool> DeleteMessageBoardAsync(int boardid);
    Task<bool> CheckUserInBoardAsync(ActiveUser user, int boardid);
    // helpers
    int GetNextBoardId();
}