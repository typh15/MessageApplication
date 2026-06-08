public class ActiveUser
{
    public string UserName { get; set; }
    public string Address { get; set; }
    public DateTime LastActiveTime { get; set; }
    public string? UniqueId { get; set; }
    public List<int> MessageBoardIds { get; set; }
    public List<int> RequestedMessageBoardIds { get; set; }

    public ActiveUser(string userName, string address, DateTime lastActiveTime, string? uniqueId = "")
    {
        UserName = userName;
        Address = address;
        LastActiveTime = lastActiveTime;
        UniqueId = uniqueId;
        MessageBoardIds = new List<int>();
        RequestedMessageBoardIds = new List<int>();
    }
}