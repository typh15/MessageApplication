public class AccountDataUserNamesResponse
{
    public string UniqueId { get; set; }
    public string UserName {get; set;}
    public string? DisplayName { get; set; }
    public string? AvatarImageId { get; set; }
    public string? PublicBlurb { get; set; }

    public AccountDataUserNamesResponse(
        string uniqueId,
        string userName,
        string? displayName,
        string? avatarImageId,
        string? publicBlurb)
    {
        UniqueId = uniqueId;
        UserName = userName;
        DisplayName = displayName;
        AvatarImageId = avatarImageId;
        PublicBlurb = publicBlurb;
    }
}
