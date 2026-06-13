public class AccountServices : IAccountServices
{
    private readonly IUserAccountRepository userAccountRepository;
    private readonly IImageServices imageServices;

    public AccountServices(
        IUserAccountRepository userAccountRepository,
        IImageServices imageServices)
    {
        this.userAccountRepository = userAccountRepository;
        this.imageServices = imageServices;
    }

    public async Task<PublicAccountDataResponse?> CreateUserAccountAsync(CreateUserAccount request)
    {
        if (request == null)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(request.UniqueId) || string.IsNullOrWhiteSpace(request.AuthId))
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(request.AvatarImageId))
        {
            var avatarIsValid = await ImageBelongsToAccountAsync(
                request.UniqueId,
                request.AvatarImageId);

            if (!avatarIsValid)
            {
                return null;
            }
        }

        var userAccount = new UserAccount(request.UniqueId, request.AuthId)
        {
            DisplayName = request.DisplayName,
            AvatarImageId = request.AvatarImageId,
            PublicBlurb = request.PublicBlurb
        };

        var accountWasAdded = await userAccountRepository.AddUserAccountAsync(userAccount);
        if (!accountWasAdded)
        {
            return null;
        }

        return CreatePublicAccountDataResponse(userAccount);
    }

    public async Task<PublicAccountDataResponse?> GetUserAccountAsync(string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return null;
        }

        var userAccount = await userAccountRepository.GetUserAccountAsync(uniqueId);
        if (userAccount == null)
        {
            return null;
        }

        return CreatePublicAccountDataResponse(userAccount);
    }

    public Task<bool> UpdateDisplayNameAsync(string uniqueId, string displayName)
    {
        return userAccountRepository.UpdateDisplayName(uniqueId, displayName);
    }

    public async Task<bool> UpdateAvatarImageAsync(string uniqueId, string avatarImageId)
    {
        var avatarIsValid = await ImageBelongsToAccountAsync(uniqueId, avatarImageId);
        if (!avatarIsValid)
        {
            return false;
        }

        return await userAccountRepository.UpdateAvatarImage(uniqueId, avatarImageId);
    }

    public Task<bool> UpdatePublicTextAsync(string uniqueId, string publicText)
    {
        return userAccountRepository.UpdatePublicText(uniqueId, publicText);
    }

    private async Task<bool> ImageBelongsToAccountAsync(string uniqueId, string imageId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId) || string.IsNullOrWhiteSpace(imageId))
        {
            return false;
        }

        var image = await imageServices.GetImageAsync(imageId);
        if (image == null)
        {
            return false;
        }

        return image.OwnerUniqueId == uniqueId;
    }

    private PublicAccountDataResponse CreatePublicAccountDataResponse(UserAccount userAccount)
    {
        return new PublicAccountDataResponse(
            userAccount.UniqueId,
            userAccount.DisplayName,
            userAccount.AvatarImageId,
            userAccount.PublicBlurb);
    }
}
