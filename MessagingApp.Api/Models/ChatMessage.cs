public class ChatMessage
{
    public int Id { get; set; }
    public string FromUserName { get; set; }
    public MessageBoard ParentBoard { get; set; }
    public DateTime ClientTimestamp { get; set; }
    public DateTime ServerTimestamp { get; set; }
    public string Content { get; set; }
    public string GlobalId { get; set; }
    public int Hash{ get; set; }



    public ChatMessage(int id, string fromUserName, 
    MessageBoard parentBoard, DateTime clientTimestamp, 
    DateTime serverTimestamp, string content)
    {
        Id = id;
        FromUserName = fromUserName;
        ParentBoard = parentBoard;
        ClientTimestamp = clientTimestamp;
        ServerTimestamp = serverTimestamp;
        Content = content;
        GlobalId = "";
        Hash = HashCode.Combine(Id, FromUserName, ParentBoard.BoardId, ClientTimestamp, ServerTimestamp, Content);
    }

    public void AssignGlobalId()
    {
        GlobalId = $"{ParentBoard.BoardId}-{Id}";
    }


}
