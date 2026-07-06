public class PublicProfileServices : IPublicProfileServices
{
    private readonly IActiveUserRepository activeUserRepository;
    private readonly IUserAccountRepository userAccountRepository;

    public PublicProfileServices(
        IActiveUserRepository activeUserRepository,
        IUserAccountRepository userAccountRepository)
    {
        this.activeUserRepository = activeUserRepository;
        this.userAccountRepository = userAccountRepository;
    }

    public async Task<List<AccountDataUserNamesResponse>> GetAllPublicProfiles()
    {
        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var publicAccountDataList = new List<AccountDataUserNamesResponse>();

        foreach (var user in activeUsers)
        {
            var uniqueId = user.UniqueId;
            var userName = user.UserName;
            if (string.IsNullOrWhiteSpace(uniqueId))
            {
                continue;
            }

            var userAccountData = await userAccountRepository.GetUserAccountAsync(uniqueId);
            if (userAccountData == null)
            {
                continue;
            }

            publicAccountDataList.Add(new AccountDataUserNamesResponse(
                uniqueId,
                userName,
                userAccountData.DisplayName,
                userAccountData.AvatarImageId,
                userAccountData.PublicBlurb));
        }

        return publicAccountDataList;
    }

    public async Task<AccountDataUserNamesResponse?> GetPublicProfile(string userName)
    {
        var activeUser = await activeUserRepository.GetActiveUserByUserName(userName);
        if (activeUser == null || string.IsNullOrWhiteSpace(activeUser.UniqueId))
        {
            return null;
        }

        var uniqueId = activeUser.UniqueId;
        var userAccountData = await userAccountRepository.GetUserAccountAsync(uniqueId);
        if (userAccountData == null)
        {
            return null;
        }

        return new AccountDataUserNamesResponse(
            uniqueId,
            userName,
            userAccountData.DisplayName,
            userAccountData.AvatarImageId,
            userAccountData.PublicBlurb);
    }
}
