public class UserAccount
{
    public string UniqueId { get; set; }
    public string AuthId { get; set; }
    public string PasswordHash { get; set; }
    public string? DisplayName { get; set; }
    public string? AvatarImageId { get; set; }
    public string? PublicBlurb { get; set; }

    public UserAccount(string uniqueId, string authId, string passwordHash)
    {
        UniqueId = uniqueId;
        AuthId = authId;
        PasswordHash = passwordHash;
    }
}
