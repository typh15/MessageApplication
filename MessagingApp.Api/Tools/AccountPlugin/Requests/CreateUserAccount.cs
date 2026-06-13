public class CreateUserAccount
{
    public string UniqueId { get; set; }
    public string AuthId { get; set; }
    public string? DisplayName { get; set; }
    public string? AvatarImageId { get; set; }
    public string? PublicBlurb { get; set; }

    public CreateUserAccount(string uniqueId, string authId)
    {
        UniqueId = uniqueId;
        AuthId = authId;
    }
}
