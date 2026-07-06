public interface IActiveUserServices
{
    Task<List<ActiveUser>> GetAllActiveUsersAsync();
    Task<List<string>> GetAllActiveUserNames();
    Task<CreateActiveUserResponse?> CreateAnonymousActiveUserAsync(string userName, string userAddress);
    Task<CreateActiveUserResponse?> CreateActiveUserAsync(string userName, string userAddress, string uniqueId);
    Task<CreateActiveUserResponse?> CreateOrRefreshActiveUserAsync(string userName, string userAddress, string uniqueId);
    Task<bool> IsUserActiveAsync(string uniqueId);
}
