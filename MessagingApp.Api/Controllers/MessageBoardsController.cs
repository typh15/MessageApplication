using Microsoft.AspNetCore.Mvc;

[ApiController]
public class MessageBoardController : ControllerBase
{
    private readonly IChatServices chatService;

    public MessageBoardController(IChatServices chatService)
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

        if (string.IsNullOrWhiteSpace(request.UniqueId))
        {
            return BadRequest("No UniqueId Found.");
        }

        var board = await chatService.CreateMessageBoardAsync(
            request.UniqueId,
            request.BoardName,
            request.VisibleToPublic,
            request.PasswordProtected,
            request.Password
        );


        if (board == null)
        {
            return BadRequest("Unable to create board.");
        }

        return Ok(board);
    }

}