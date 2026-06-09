public class JoinBoardRequestDisplay
{
    public string UserName { get; set; }
    public string UniqueId { get; set; }

    public JoinBoardRequestDisplay(string userName, string uniqueId)
    {
        UserName = userName;
        UniqueId = uniqueId;
    }
}
