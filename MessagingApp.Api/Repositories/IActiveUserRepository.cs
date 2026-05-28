public interface IActiveUserRepository
{
    Task<bool> AddActiveUserAsync(ActiveUser activeUser);
    Task<List<ActiveUser>> GetActiveUsersAsync();
    Task<bool> UpdateActiveUserAsync(ActiveUser activeUser);
    Task<bool> RemoveActiveUserAsync(string userName);
    Task<bool> IsUserActiveAsync(string uniqueId);
    Task<bool> DoesUserExistAsync(string userName);
    Task RemoveInactiveUsersAsync(TimeSpan inactivityThreshold);
}