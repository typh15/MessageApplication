public class CreateChatMessageRequest
{
    public string FromUserName { get; set; } = string.Empty;
    public string ToUserName { get; set; } = string.Empty;
    public DateTime LocalTimestamp { get; set; } = DateTime.UtcNow;
    public string Content { get; set; } = string.Empty;
    public string UniqueId { get; set; } = string.Empty;
    public MessageTypeEnum MessageType { get; set; } = MessageTypeEnum.text;
    public string? ImageId { get; set; }
}