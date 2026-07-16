public class ChatMessage
{
    public int Id { get; set; }
    public string FromUserName { get; set; }
    public string FromDisplayName { get; set; }
    public int BoardId { get; set; }
    public DateTime ClientTimestamp { get; set; }
    public DateTime ServerTimestamp { get; set; }
    public string Content { get; set; }
    public string GlobalId { get; set; }
    public int Hash{ get; set; }
    public MessageTypeEnum MessageType { get; set; } = MessageTypeEnum.text;
    public string? ImageId { get; set; }
    public string? ClientRequestId { get; set; }


    public ChatMessage(int id, string fromUserName, 
    string fromDisplayName, 
    int boardId, DateTime clientTimestamp, 
    DateTime serverTimestamp, string content, 
    MessageTypeEnum messageType, string? imageId, string? clientRequestId = null)
    {
        Id = id;
        FromUserName = fromUserName;
        FromDisplayName = fromDisplayName;
        BoardId = boardId;
        ClientTimestamp = clientTimestamp;
        ServerTimestamp = serverTimestamp;
        Content = content;
        
        GlobalId = "";
        Hash = HashCode.Combine(Id, FromUserName, BoardId, ClientTimestamp, ServerTimestamp, Content);
        MessageType = messageType;
        ImageId = imageId;
        ClientRequestId = clientRequestId;
    }

    public void AssignGlobalId()
    {
        GlobalId = $"{BoardId}-{Id}";
    }


}
