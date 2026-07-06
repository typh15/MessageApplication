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

        if (!result.Succeeded)
        {
            return CreateSendMessageFailureResponse(result);
        }

        return Ok(result.Response);
    }


    [HttpDelete("/message-boards/{boardId}/messages/{messageId}")]
    public async Task<IActionResult> DeleteMessageAsync(
        int boardId,
        int messageId,
        string uniqueId)
    {

        bool wasDeleted = await chatService.DeleteMessageAsync(
            uniqueId,
            boardId,
            messageId
        );

        if (!wasDeleted)
        {
            return NotFound();
        }

        return Ok();
    }


    private IActionResult CreateSendMessageFailureResponse(SendMessageServiceResult result)
    {
        var message = result.FailureMessage ?? "Unable to send message.";

        return result.FailureReason switch
        {
            SendMessageFailureReason.BoardNotFound => NotFound(message),
            SendMessageFailureReason.MissingUniqueId => Unauthorized(message),
            SendMessageFailureReason.InactiveUser => Unauthorized(message),
            SendMessageFailureReason.ActiveUserNotFound => Unauthorized(message),
            SendMessageFailureReason.NotBoardMember => StatusCode(StatusCodes.Status403Forbidden, message),
            SendMessageFailureReason.MissingImageId => BadRequest(message),
            SendMessageFailureReason.ImageNotFound => NotFound(message),
            SendMessageFailureReason.ImageOwnerMismatch => StatusCode(StatusCodes.Status403Forbidden, message),
            SendMessageFailureReason.PersistenceFailed => StatusCode(
                StatusCodes.Status500InternalServerError,
                message),
            _ => BadRequest(message),
        };
    }
}
