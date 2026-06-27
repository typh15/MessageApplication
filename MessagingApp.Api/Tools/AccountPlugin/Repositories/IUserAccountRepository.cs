public interface IUserAccountRepository
{
    Task<bool> AddUserAccountAsync(UserAccount userAccount);
    Task<UserAccount?> GetUserAccountAsync(string uniqueId);
    Task<UserAccount?> GetUserAccountByAuthIdAsync(string authId);
    Task<bool> UpdateDisplayName(string uniqueId, string newName);
    Task<bool> UpdateAvatarImage(string uniqueId, string avatarImageId);
    Task<bool> UpdatePublicText(string uniqueId, string publicText);
}
