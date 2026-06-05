public class CreateActiveUserResponse
{
    public string UserName { get; set; }
    public string UniqueId { get; set; }

    public CreateActiveUserResponse(string userName, string uniqueId)
    {
        UserName = userName;
        UniqueId = uniqueId;
    }
}
