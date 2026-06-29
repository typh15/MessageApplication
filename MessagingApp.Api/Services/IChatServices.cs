public interface IChatServices
{
    Task<List<MessageBoardDataResponse>> GetMessageBoardsAsync(string uniqueId);
    Task<MessageBoardDataResponse?> GetMessageBoardByIdAsync(int boardId, string uniqueId);
    Task<MessageBoardDataResponse?> CreateMessageBoardAsync(string uniqueId, string boardName, bool visibleToPublic, bool passwordProtected, string password);
    Task<List<ActiveUser>> GetAllActiveUsersAsync();
    Task<List<String>> GetAllActiveUserNames();
    Task<List<ChatMessage>> GetMessagesForBoardAsync(int boardId);
    Task<CreateActiveUserResponse?> CreateAnonymousActiveUserAsync(string userName, string userAddress);
    Task<CreateActiveUserResponse?> CreateActiveUserAsync(string userName, string userAddress, string uniqueId);
    Task<CreateActiveUserResponse?> CreateOrRefreshActiveUserAsync(string userName, string userAddress, string uniqueId);
    Task<SendMessageResponse?> SendMessageToBoardAsync(int boardId, CreateChatMessageRequest request, string userAddress);
    Task<bool> JoinBoardAsync(int boardId, string uniqueId, string userAddress, bool allowed);
    Task<bool> LeaveBoardAsync(int boardId, string uniqueId);
    Task<bool> AddFavoriteBoardAsync(int boardId, string uniqueId);
    Task<bool> RemoveFavoriteBoardAsync(int boardId, string uniqueId);
    Task<bool> DeleteMessageAsync(string uniqueId, int boardId, int messageId);
    Task<bool> CheckIfUserCanJoin(int boardId, string uniqueId, JoinBoardRequest request);
    Task<bool> CheckIfUserCanRequest(RequestJoinBoardRequest request);
    Task<bool> AddUserToRequests(string uniqueBoardId, string uniqueId, string userAddress, bool allowed);
    Task<bool> ApproveUserJoinRequest(int boardId, string MemberUniqueId, string userName);
    Task<bool> DenyUserJoinRequest(int boardId, string MemberUniqueId, string userName);
    Task<List<String>> GetPublicBoardNames();
    Task<bool> IsUserActiveAsync(string uniqueId);
    Task<List<JoinBoardRequestDisplay>?> GetBoardJoinRequestsAsync(int boardId, string memberUniqueId);
    Task<bool> InviteUserJoinRequest(int boardId, string memberUniqueId, string inviteUserName);
    Task<List<MessageBoardInviteResponse>?> GetUserInvitesAsync(string uniqueId);
    Task<bool> AcceptBoardInvite(int boardId, string uniqueId);
    Task<bool> RejectBoardInvite(int boardId, string uniqueId);
    Task<bool> JoinBoardByCodeAsync(string uniqueBoardId, string uniqueId, string password, string userAddress);
    Task<List<AccountDataUserNamesResponse>> GetAllPublicProfiles();
    Task<AccountDataUserNamesResponse?> GetPublicProfile(string userName);
}
