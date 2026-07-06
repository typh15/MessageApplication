public interface IBoardMembershipServices
{
    Task<bool> JoinBoardAsync(int boardId, string uniqueId, string userAddress, bool allowed);
    Task<bool> LeaveBoardAsync(int boardId, string uniqueId);
    Task<bool> CheckIfUserCanJoin(int boardId, string uniqueId, JoinBoardRequest request);
    Task<bool> CheckIfUserCanRequest(RequestJoinBoardRequest request);
    Task<bool> AddUserToRequests(string uniqueBoardId, string uniqueId, string userAddress, bool allowed);
    Task<bool> ApproveUserJoinRequest(int boardId, string memberUniqueId, string userName);
    Task<bool> DenyUserJoinRequest(int boardId, string memberUniqueId, string userName);
    Task<List<AccountDataUserNamesResponse>?> GetBoardMembersAsync(int boardId, string uniqueId);
    Task<List<JoinBoardRequestDisplay>?> GetBoardJoinRequestsAsync(int boardId, string memberUniqueId);
    Task<bool> InviteUserJoinRequest(int boardId, string memberUniqueId, string inviteUserName);
    Task<List<MessageBoardInviteResponse>?> GetUserInvitesAsync(string uniqueId);
    Task<bool> AcceptBoardInvite(int boardId, string uniqueId);
    Task<bool> RejectBoardInvite(int boardId, string uniqueId);
    Task<bool> JoinBoardByCodeAsync(string uniqueBoardId, string uniqueId, string password, string userAddress);
}
