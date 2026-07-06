public class ActiveUserServices : IActiveUserServices
{
    private readonly IActiveUserRepository activeUserRepository;
    private readonly IActiveUserSessionServices activeUserSessionServices;

    public ActiveUserServices(
        IActiveUserRepository activeUserRepository,
        IActiveUserSessionServices activeUserSessionServices)
    {
        this.activeUserRepository = activeUserRepository;
        this.activeUserSessionServices = activeUserSessionServices;
    }

    public async Task<List<ActiveUser>> GetAllActiveUsersAsync()
    {
        return await activeUserRepository.GetAllActiveUsersAsync();
    }

    public async Task<List<string>> GetAllActiveUserNames()
    {
        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        return activeUsers.Select(user => user.UserName).ToList();
    }

    public async Task<CreateActiveUserResponse?> CreateAnonymousActiveUserAsync(
        string userName,
        string userAddress)
    {
        var uniqueId = Guid.NewGuid().ToString();
        return await CreateActiveUserAsync(userName, userAddress, uniqueId);
    }

    public async Task<CreateActiveUserResponse?> CreateActiveUserAsync(
        string userName,
        string userAddress,
        string uniqueId)
    {
        var doesUserNameExist = await activeUserRepository.DoesUserExistAsync(userName);

        if (doesUserNameExist)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(userName) || string.IsNullOrWhiteSpace(uniqueId))
        {
            return null;
        }

        var activeUser = new ActiveUser(
            userName,
            userAddress,
            DateTime.UtcNow,
            uniqueId);

        var activeUserWasAdded = await activeUserRepository.AddActiveUserAsync(activeUser);
        if (!activeUserWasAdded)
        {
            return null;
        }

        return new CreateActiveUserResponse(userName, uniqueId);
    }

    public async Task<CreateActiveUserResponse?> CreateOrRefreshActiveUserAsync(
        string userName,
        string userAddress,
        string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(userName) || string.IsNullOrWhiteSpace(uniqueId))
        {
            return null;
        }

        var activeUserByUniqueId = await activeUserRepository.GetActiveUserByUniqueId(uniqueId);
        if (activeUserByUniqueId != null)
        {
            activeUserByUniqueId.UserName = userName;
            activeUserByUniqueId.Address = userAddress;
            activeUserByUniqueId.LastActiveTime = DateTime.UtcNow;
            await activeUserRepository.UpdateActiveUserAsync(activeUserByUniqueId);
            return new CreateActiveUserResponse(userName, uniqueId);
        }

        var activeUserByUserName = await activeUserRepository.GetActiveUserByUserName(userName);
        if (activeUserByUserName != null)
        {
            if (!string.Equals(activeUserByUserName.UniqueId, uniqueId, StringComparison.Ordinal))
            {
                return null;
            }

            activeUserByUserName.Address = userAddress;
            activeUserByUserName.LastActiveTime = DateTime.UtcNow;
            await activeUserRepository.UpdateActiveUserAsync(activeUserByUserName);
            return new CreateActiveUserResponse(userName, uniqueId);
        }

        return await CreateActiveUserAsync(userName, userAddress, uniqueId);
    }

    public Task<bool> IsUserActiveAsync(string uniqueId)
    {
        return activeUserSessionServices.IsUserActiveAsync(uniqueId);
    }
}
