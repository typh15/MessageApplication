public interface IChatService
{
    Task<List<MessageBoardDataResponse>> GetMessageBoardsAsync(string uniqueId);
    Task<MessageBoardDataResponse?> GetMessageBoardByIdAsync(int boardId, string uniqueId);
    Task<MessageBoardDataResponse?> CreateMessageBoardAsync(string uniqueId, string boardName, bool visibleToPublic, bool passwordProtected, string password);
    Task<List<ChatMessage>> GetMessagesForBoardAsync(int boardId);
    Task<List<ActiveUser>> GetAllActiveUsersAsync();
    Task<List<String>> GetAllActiveUserNames();
    Task<List<String>> GetPublicBoardNames();
    Task<CreateActiveUserResponse?> CreateActiveUserAsync(string userName, string userAddress);
    Task<SendMessageResponse?> SendMessageToBoardAsync(int boardId, CreateChatMessageRequest request, string userAddress);
    Task<bool> JoinBoardAsync(int boardId, string uniqueId, string userAddress, bool allowed);
    Task<bool> DeleteMessageAsync(int boardId, int messageId);
    Task<bool> CheckIfUserCanJoin(int boardId, string uniqueId, JoinBoardRequest request);
    Task<bool> AddUserToRequests(string boardName, string uniqueId, string userAddress, bool allowed);
    Task<bool> ApproveUserJoinRequest(int boardId, string MemberUniqueId, string userName);
    Task<bool> CheckIfUserCanRequest(RequestJoinBoardRequest request);

}