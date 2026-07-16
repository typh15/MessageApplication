using Microsoft.AspNetCore.Mvc;

[ApiController]
public class MessagesController : ControllerBase
{
    private readonly IMessageServices messageServices;
    private readonly IMessageBoardServices messageBoardServices;

    public MessagesController(
        IMessageServices messageServices,
        IMessageBoardServices messageBoardServices)
    {
        this.messageServices = messageServices;
        this.messageBoardServices = messageBoardServices;
    }


    [HttpGet("/message-boards/{boardId}/messages")]
    public async Task<IActionResult> GetMessagesForBoardAsync(int boardId, string uniqueId)
    {
        var board = await messageBoardServices.GetMessageBoardByIdAsync(boardId, uniqueId);

        if (board == null)
        {
            return NotFound($"Message board {boardId} was not found.");
        }

        var messages = await messageServices.GetMessagesForBoardAsync(boardId);

        return Ok(messages);
    }

    [HttpPost("/message-boards/{boardId}/messages")]
    public async Task<IActionResult> SendMessageToBoardAsync(
        int boardId,
        [FromBody] CreateChatMessageRequest request)
    {
        var userAddress =
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
        var publicImageBaseUrl = CreatePublicImageBaseUrl(HttpContext.Request);

        var result = await messageServices.SendMessageToBoardAsync(
            boardId,
            request,
            userAddress,
            publicImageBaseUrl
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

        bool wasDeleted = await messageServices.DeleteMessageAsync(
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

    private static string? CreatePublicImageBaseUrl(HttpRequest request)
    {
        if (!request.Host.HasValue ||
            !string.Equals(request.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var host = request.Host.Host;
        if (string.IsNullOrWhiteSpace(host) || IsLocalHost(host))
        {
            return null;
        }

        return $"{Uri.UriSchemeHttps}://{request.Host.Value}";
    }

    private static bool IsLocalHost(string host)
    {
        return string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(host, "::1", StringComparison.OrdinalIgnoreCase) ||
               host.StartsWith("127.", StringComparison.OrdinalIgnoreCase);
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
            SendMessageFailureReason.InvalidClientRequestId => BadRequest(message),
            SendMessageFailureReason.PersistenceFailed => StatusCode(
                StatusCodes.Status500InternalServerError,
                message),
            _ => BadRequest(message),
        };
    }
}
