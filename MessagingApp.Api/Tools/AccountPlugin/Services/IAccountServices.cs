public interface IAccountServices
{
    Task<PublicAccountDataResponse?> CreateUserAccountAsync(CreateUserAccount request);
    Task<PublicAccountDataResponse?> GetUserAccountAsync(string uniqueId);
    Task<bool> UpdateDisplayNameAsync(string uniqueId, string displayName);
    Task<bool> UpdateAvatarImageAsync(string uniqueId, string avatarImageId);
    Task<bool> UpdatePublicTextAsync(string uniqueId, string publicText);
}
