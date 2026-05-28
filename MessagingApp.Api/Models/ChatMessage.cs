public class ChatMessage
{
    public int Id { get; set; }
    public string FromUserName { get; set; }
    public string ToUserName { get; set; }
    public DateTime ClientTimestamp { get; set; }
    public DateTime ServerTimestamp { get; set; }
    public string Content { get; set; }

    public ChatMessage(int id, string fromUserName, 
    string toUserName, DateTime clientTimestamp, 
    DateTime serverTimestamp, string content)
    {
        Id = id;
        FromUserName = fromUserName;
        ToUserName = toUserName;
        ClientTimestamp = clientTimestamp;
        ServerTimestamp = serverTimestamp;
        Content = content;
    }
}