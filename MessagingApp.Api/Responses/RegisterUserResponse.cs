public class RegisterUserResponse
{
    public string UserName { get; set; }
    public string UniqueId { get; set; }
    public PublicAccountDataResponse Account { get; set; }

    public RegisterUserResponse(
        string userName,
        string uniqueId,
        PublicAccountDataResponse account)
    {
        UserName = userName;
        UniqueId = uniqueId;
        Account = account;
    }
}
