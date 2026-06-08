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
    public async Task<List<MessageBoardDataResponse>> GetMessageBoardsAsync(string uniqueId)
    {
        return await chatService.GetMessageBoardsAsync(uniqueId);
    }
    
    [HttpGet("/message-boards/{boardId}")]
    public async Task<IActionResult> GetMessageBoardByIdAsync(int boardId, string uniqueId)
    {
        var board = await chatService.GetMessageBoardByIdAsync(boardId, uniqueId);

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

    [HttpGet("/public-boardnames")]
    public async Task<IActionResult> GetAllPublicBoardNamesAsync()
    {

        var result = await chatService.GetPublicBoardNames();


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
            request.UniqueId,
            request.BoardName,
            request.VisibleToPublic,
            request.PasswordProtected,
            request.Password
        );

        if (board == null)
        {
            return BadRequest("Public board with that name already exists.");
        }

        return Ok(board);
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

    [HttpPost("/message-boards/{boardId}/join")]
    public async Task<IActionResult> JoinMessageBoardAsync(
        int boardId,
        [FromBody] JoinBoardRequest request)
    {   
        
        var userAddress =
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

        var canJoin = await chatService.CheckIfUserCanJoin(boardId, request.UniqueId, request);

        var success = await chatService.JoinBoardAsync(
            boardId,
            request.UniqueId,
            userAddress,
            canJoin
        );

        if (!success)
        {
            return BadRequest("Unable to join message board.");
        }

        return Ok();
    }

    [HttpPost("/message-boards/search")]
    public async Task<IActionResult> RequestJoinMessageBoardAsync(
        [FromBody] RequestJoinBoardRequest request)
    {   
        var userAddress =
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

        var canRequest = await chatService.CheckIfUserCanRequest(request);

        var success = await chatService.AddUserToRequests(
            request.UniqueBoardId,
            request.UniqueId,
            userAddress,
            canRequest
        );

        if (!success)
        {
            return BadRequest("Unable to request join message board.");
        }

        return Ok();
    }

    [HttpPost("/message-boards/{boardId}/approvals")]
    public async Task<IActionResult> AttemptMessageBoardApprovalAsync(
        int boardId,
        string memberUniqueId,
        string userName)
    {   
        var success = await chatService.ApproveUserJoinRequest(
            boardId,
            memberUniqueId,
            userName
        );

        if (!success)
        {
            return BadRequest("Unable to approve of message board join request.");
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