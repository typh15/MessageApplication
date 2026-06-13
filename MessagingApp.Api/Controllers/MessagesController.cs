using Microsoft.AspNetCore.Mvc;

[ApiController]
public class MessagesController : ControllerBase
{
    private readonly IChatServices chatService;

    public MessagesController(IChatServices chatService)
    {
        this.chatService = chatService;
    }


    [HttpGet("/message-boards/{boardId}/messages")]
    public async Task<IActionResult> GetMessagesForBoardAsync(int boardId, string uniqueId)
    {
        var board = await chatService.GetMessageBoardByIdAsync(boardId, uniqueId);

        if (board == null)
        {
            return NotFound($"Message board {boardId} was not found.");
        }

        var messages = await chatService.GetMessagesForBoardAsync(boardId);

        return Ok(messages);
    }

    [HttpPost("/message-boards/{boardId}/messages")]
    public async Task<IActionResult> SendMessageToBoardAsync(
        int boardId,
        [FromBody] CreateChatMessageRequest request)
    {
        var userAddress =
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

        var result = await chatService.SendMessageToBoardAsync(
            boardId,
            request,
            userAddress
            
        );

        if (result == null)
        {
            return BadRequest("Unable to send message.");
        }

        return Ok(result);
    }


    [HttpDelete("/message-boards/{boardId}/messages/{messageId}")]
    public async Task<IActionResult> DeleteMessageAsync(
        int boardId,
        int messageId)
    {
        bool wasDeleted = await chatService.DeleteMessageAsync(
            boardId,
            messageId
        );

        if (!wasDeleted)
        {
            return NotFound();
        }

        return Ok();
    }


}