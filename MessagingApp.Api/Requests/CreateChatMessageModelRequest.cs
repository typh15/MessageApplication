public class CreateChatMessageModelRequest
{
    public string FromUserName { get; set; } = string.Empty;
    public string ToUserName { get; set; } = string.Empty;
    public int Timestamp { get; set; } = 0;
    public string Content { get; set; } = string.Empty;
}