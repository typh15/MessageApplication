public class ActiveUserSessionServices : IActiveUserSessionServices
{
    private readonly IActiveUserRepository activeUserRepository;

    public ActiveUserSessionServices(IActiveUserRepository activeUserRepository)
    {
        this.activeUserRepository = activeUserRepository;
    }

    public async Task<bool> IsUserActiveAsync(string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return false;
        }

        return await activeUserRepository.IsUserActiveAsync(uniqueId);
    }

    public async Task<ActiveUser?> GetActiveUserAsync(string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return null;
        }

        return await activeUserRepository.GetActiveUserByUniqueId(uniqueId);
    }

    public async Task<ActiveUser?> GetActiveUserIfActiveAsync(string uniqueId)
    {
        var isActive = await IsUserActiveAsync(uniqueId);
        if (!isActive)
        {
            return null;
        }

        return await GetActiveUserAsync(uniqueId);
    }

    public async Task<ActiveUser?> RefreshActiveUserAsync(string uniqueId, string userAddress)
    {
        var activeUser = await GetActiveUserIfActiveAsync(uniqueId);
        if (activeUser == null)
        {
            return null;
        }

        activeUser.LastActiveTime = DateTime.UtcNow;
        activeUser.Address = userAddress;
        await activeUserRepository.UpdateActiveUserAsync(activeUser);

        return activeUser;
    }
}
