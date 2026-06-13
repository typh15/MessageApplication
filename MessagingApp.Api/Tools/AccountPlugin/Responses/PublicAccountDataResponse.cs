public class PublicAccountDataResponse
{
    public string UniqueId { get; set; }
    public string? DisplayName { get; set; }
    public string? AvatarImageId { get; set; }
    public string? PublicBlurb { get; set; }

    public PublicAccountDataResponse(
        string uniqueId,
        string? displayName,
        string? avatarImageId,
        string? publicBlurb)
    {
        UniqueId = uniqueId;
        DisplayName = displayName;
        AvatarImageId = avatarImageId;
        PublicBlurb = publicBlurb;
    }
}
