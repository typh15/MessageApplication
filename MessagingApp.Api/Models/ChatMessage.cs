public class ChatMessage
{
    public int Id { get; set; }
    public string FromUserName { get; set; }
    public string ToUserName { get; set; }
    public int Timestamp { get; set; }
    public string Content { get; set; }

    public ChatMessage(int id, string fromUserName, string toUserName, int timestamp, string content)
    {
        Id = id;
        FromUserName = fromUserName;
        ToUserName = toUserName;
        Timestamp = timestamp;
        Content = content;
    }
}