public interface IActiveUserSessionServices
{
    Task<bool> IsUserActiveAsync(string uniqueId);
    Task<ActiveUser?> GetActiveUserAsync(string uniqueId);
    Task<ActiveUser?> GetActiveUserIfActiveAsync(string uniqueId);
    Task<ActiveUser?> RefreshActiveUserAsync(string uniqueId, string userAddress);
}
