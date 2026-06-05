public class ChatMessage
{
    public int Id { get; set; }
    public string FromUserName { get; set; }
    public int BoardId { get; set; }
    public DateTime ClientTimestamp { get; set; }
    public DateTime ServerTimestamp { get; set; }
    public string Content { get; set; }
    public string GlobalId { get; set; }
    public int Hash{ get; set; }



    public ChatMessage(int id, string fromUserName, 
    int boardId, DateTime clientTimestamp, 
    DateTime serverTimestamp, string content)
    {
        Id = id;
        FromUserName = fromUserName;
        BoardId = boardId;
        ClientTimestamp = clientTimestamp;
        ServerTimestamp = serverTimestamp;
        Content = content;
        GlobalId = "";
        Hash = HashCode.Combine(Id, FromUserName, BoardId, ClientTimestamp, ServerTimestamp, Content);
    }

    public void AssignGlobalId()
    {
        GlobalId = $"{BoardId}-{Id}";
    }


}
