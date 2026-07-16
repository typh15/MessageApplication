public interface IMessageBoardRepository
{
    int GetNextBoardId();
    Task<MessageBoardDataResponse?> CreateMessageBoardAsync(ActiveUser user, string boardName, bool visibleToPublic, bool passwordProtected, string password);
    Task<List<MessageBoardDataResponse>> GetMessageBoardsAsync();
    Task<MessageBoard?> GetMessageBoardByIdAsync(int id);
    Task<MessageBoard?> GetMessageBoardByNameAsync(string name);
    Task<MessageBoard?> GetMessageBoardByUIdAsync(string uniqueBoardId);
    Task<MessageBoardDataResponse?> GetMessageBoardDataByIdAsync(int id);
    Task<ChatMessage?> GetMessageByIdAsync(int boardid, int id);
    Task<AppendMessageToBoardResult> AppendMessageToBoardAsync(
        int boardid,
        string fromUserName,
        string fromDisplayName,
        DateTime clientTimestamp,
        DateTime serverTimestamp,
        string content,
        MessageTypeEnum messageType,
        string? imageId);
    Task<bool> UpdateBoardNameAsync(int boardid, string newName);
    Task<bool> DeleteMessageBoardAsync(int boardid);
    Task<bool> AddUserToBoardAsync(int boardid, ActiveUser user);
    Task<bool> RemoveUserFromBoardAsync(int boardid, ActiveUser user);
    Task<bool> RemoveUserFromRequestAsync(int boardid, ActiveUser user);
    Task<bool> RemoveUserFromInviteAsync(int boardid, ActiveUser user);
    Task<bool> DeleteMessageAsync(int boardid, int messageid);
    Task<bool> DeleteUserBoardDataAsync(ActiveUser user);
    Task<bool> CheckUserInBoardAsync(int boardid, ActiveUser user);
    Task<bool> CheckBoardPasswordAsync(int boardid, string password);
    Task<bool> CheckUserInRequestedListAsync(int boardid, ActiveUser user);
    Task<bool> AddUserToRequestedListAsync(int boardid, ActiveUser requestingUser);
    Task<bool> CheckUserInInvitesListAsync(int boardid, ActiveUser user);
    Task<bool> AddUserToInvitesListAsync(int boardid, ActiveUser invitedUser);
    // helpers
}
