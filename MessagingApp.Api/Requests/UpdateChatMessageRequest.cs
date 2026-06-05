public class UpdateChatMessageRequest
{
    public int Id { get; set; } = 0;
    public string FromUserName { get; set; } = string.Empty;
    public string ToUserName { get; set; } = string.Empty;
    public DateTime LocalTimestamp { get; set; } = DateTime.UtcNow;
    public string Content { get; set; } = string.Empty;
}