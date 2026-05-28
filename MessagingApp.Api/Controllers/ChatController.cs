
using Microsoft.AspNetCore.Mvc;

[ApiController]
public class ChatController : ControllerBase
{
    private readonly IChatMessageRepository repository;

    public ChatController(IChatMessageRepository repository)
    {
        this.repository = repository;
    }

    [HttpGet("/chat-messages")]
    public async Task<List<ChatMessage>> GetChatMessages()
    {
        return await repository.GetChatMessagesAsync();
    }

    [HttpGet("/chat-messages/{id}")]
    public async Task<ChatMessage?> GetChatMessageById(int id)
    {
        return await repository.GetChatMessageByIdAsync(id);
    }

    [HttpPost("/chat-messages")]
    public async Task<IActionResult> AddChatMessageAsync([FromBody] CreateChatMessageModelRequest request)
    {
        var chatMessageRequest = new ChatMessage(
            0,// Id will be set in the repository
            request.FromUserName,
            request.ToUserName,
            request.Timestamp,
            request.Content
        );

        await repository.AddChatMessageAsync(chatMessageRequest);
        return Ok();
    }

    [HttpPut("/chat-messages/{id}")]
    public async Task<bool> UpdateChatMessage(UpdateChatMessageModelRequest request)
    {
        var chatMessageRequest = new ChatMessage(
            request.Id,
            request.FromUserName,
            request.ToUserName,
            request.Timestamp,
            request.Content
        );
        
        return await repository.UpdateChatMessageAsync(chatMessageRequest);
    }

    [HttpDelete("/chat-messages/{id}")]
    public async Task<bool> DeleteChatMessage(int id)
    {
        return await repository.DeleteChatMessageAsync(id);
    }
}