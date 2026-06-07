using Microsoft.AspNetCore.Mvc;

[ApiController]
public class ChatController : ControllerBase
{
    private readonly IChatService chatService;

    public ChatController(IChatService chatService)
    {
        this.chatService = chatService;
    }

    [HttpGet("/message-boards")]
    public async Task<List<MessageBoard>> GetMessageBoardsAsync()
    {
        return await chatService.GetMessageBoardsAsync();
    }

    [HttpGet("/message-boards/{boardId}")]
    public async Task<IActionResult> GetMessageBoardByIdAsync(int boardId)
    {
        var board = await chatService.GetMessageBoardByIdAsync(boardId);

        if (board == null)
        {
            return NotFound($"Message board {boardId} was not found.");
        }

        return Ok(board);
    }

    [HttpPost("/active-users")]
    public async Task<IActionResult> CreateActiveUserAsync(
        [FromBody] CreateActiveUserRequest request)
    {
        var userAddress =
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

        var result = await chatService.CreateActiveUserAsync(
            request.UserName,
            userAddress
        );

        if (result == null)
        {
            return BadRequest("Username already exists.");
        }

        return Ok(result);
    }

    [HttpGet("/active-users")]
    public async Task<IActionResult> GetAllActiveUsersAsync()
    {

        var result = await chatService.GetAllActiveUsersAsync();

        if (result == null)
        {
            return BadRequest("No active users found.");
        }

        return Ok(result);
    }

    [HttpGet("/active-usernames")]
    public async Task<IActionResult> GetAllActiveUserNamesAsync()
    {

        var result = await chatService.GetAllActiveUserNames();


        if (result == null)
        {
            return Ok(new List<String>());
        }

        return Ok(result);
    }

    [HttpPost("/message-boards")]
    public async Task<IActionResult> CreateMessageBoardAsync(
        [FromBody] CreateMessageBoardRequest request)
    {
        var board = await chatService.CreateMessageBoardAsync(
            request.BoardName,
            request.VisibleToPublic,
            request.PasswordProtected,
            request.Password
        );

        return Ok(board);
    }

    [HttpGet("/message-boards/{boardId}/messages")]
    public async Task<IActionResult> GetMessagesForBoardAsync(int boardId)
    {
        var board = await chatService.GetMessageBoardByIdAsync(boardId);

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

    [HttpPost("/message-boards/{boardId}/join")]
    public async Task<IActionResult> JoinMessageBoardAsync(
        int boardId,
        [FromBody] JoinBoardRequest request)
    {
        var userAddress =
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

        var success = await chatService.JoinBoardAsync(
            boardId,
            request.UniqueId,
            userAddress
        );

        if (!success)
        {
            return BadRequest("Unable to join message board.");
        }

        return Ok();
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