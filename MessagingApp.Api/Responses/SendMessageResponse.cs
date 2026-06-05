public class SendMessageResponse
{
    public string UniqueId { get; set; }
    public ChatMessage Message { get; set; }

    public SendMessageResponse(string uniqueId, ChatMessage message)
    {
        UniqueId = uniqueId;
        Message = message;
    }
}