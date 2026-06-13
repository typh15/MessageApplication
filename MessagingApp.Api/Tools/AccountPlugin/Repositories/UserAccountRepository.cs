class UserAccountRepository : IUserAccountRepository
{
    private readonly List<UserAccount> userAccounts = new List<UserAccount>();


    public Task<bool> AddUserAccountAsync(UserAccount userAccount)
    {
        var existingAccount = userAccounts.Find(u => u.UniqueId == userAccount.UniqueId);
        if (existingAccount == null)
        {
            userAccounts.Add(userAccount);
            return Task.FromResult(true);
        }
        return Task.FromResult(false);
    }

    public Task<UserAccount?> GetUserAccountAsync(string uniqueId)
    {
        var userAccount = userAccounts.Find(u => u.UniqueId == uniqueId);
        return Task.FromResult(userAccount);
    }

    public Task<bool> UpdateDisplayName(string uniqueId, string newName)
    {
        var userAccount = userAccounts.Find(u => u.UniqueId == uniqueId);
        if (userAccount == null)
        {
            return Task.FromResult(false);
        }
        if (string.IsNullOrWhiteSpace(newName))
        {
            return Task.FromResult(false);
        }
        userAccount.DisplayName = newName;
        return Task.FromResult(true);
    }

    public Task<bool> UpdateAvatarImage(string uniqueId, string avatarImageId)
    {
        var userAccount = userAccounts.Find(u => u.UniqueId == uniqueId);
        if (userAccount == null)
        {
            return Task.FromResult(false);
        }
        if (string.IsNullOrWhiteSpace(avatarImageId))
        {
            return Task.FromResult(false);
        }
        userAccount.AvatarImageId = avatarImageId;
        return Task.FromResult(true);
    }

    public Task<bool> UpdatePublicText(string uniqueId, string publicText)
    {
        var userAccount = userAccounts.Find(u => u.UniqueId == uniqueId);
        if (userAccount == null)
        {
            return Task.FromResult(false);
        }
        if (publicText == null)
        {
            return Task.FromResult(false);
        }
        userAccount.PublicBlurb = publicText;
        return Task.FromResult(true);
    }
}
