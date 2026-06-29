public interface IActiveUserRepository
{
    Task<bool> AddActiveUserAsync(ActiveUser activeUser);
    Task<List<ActiveUser>> GetAllActiveUsersAsync();
    Task<bool> UpdateActiveUserAsync(ActiveUser activeUser);
    Task<bool> RemoveActiveUserAsync(string userName);
    Task<bool> IsUserActiveAsync(string uniqueId);
    Task<bool> DoesUserExistAsync(string userName);
    Task RemoveInactiveUsersAsync(TimeSpan inactivityThreshold);
    Task<ActiveUser?> GetActiveUserByUniqueId(string uniqueId);
    Task<bool> AddFavoriteBoardAsync(string uniqueId, int boardId);
    Task<bool> RemoveFavoriteBoardAsync(string uniqueId, int boardId);
    Task<List<int>> GetAllInvitedBoardIds(string uniqueId);
    Task<ActiveUser?> GetActiveUserByUserName(string userName);
}
