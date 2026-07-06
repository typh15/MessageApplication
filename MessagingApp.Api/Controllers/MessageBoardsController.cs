using Microsoft.AspNetCore.Mvc;

[ApiController]
public class MessageBoardController : ControllerBase
{
    private readonly IMessageBoardServices messageBoardServices;

    public MessageBoardController(IMessageBoardServices messageBoardServices)
    {
        this.messageBoardServices = messageBoardServices;
    }

    
    
    [HttpGet("/message-boards")]
    public async Task<List<MessageBoardDataResponse>> GetMessageBoardsAsync(string uniqueId)
    {
        return await messageBoardServices.GetMessageBoardsAsync(uniqueId);
    }
    
    [HttpGet("/message-boards/{boardId}")]
    public async Task<IActionResult> GetMessageBoardByIdAsync(int boardId, string uniqueId)
    {
        var board = await messageBoardServices.GetMessageBoardByIdAsync(boardId, uniqueId);

        if (board == null)
        {
            return NotFound($"Message board {boardId} was not found.");
        }

        return Ok(board);
    }

    [HttpGet("/public-boardnames")]
    public async Task<IActionResult> GetAllPublicBoardNamesAsync()
    {

        var result = await messageBoardServices.GetPublicBoardNames();


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

        var board = await messageBoardServices.CreateMessageBoardAsync(
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

    [HttpPost("/message-boards/{boardId}/favorite")]
    public async Task<IActionResult> AddFavoriteBoardAsync(int boardId, string uniqueId)
    {
        var success = await messageBoardServices.AddFavoriteBoardAsync(boardId, uniqueId);

        if (!success)
        {
            return BadRequest("Unable to favorite message board.");
        }

        return Ok();
    }

    [HttpDelete("/message-boards/{boardId}/favorite")]
    public async Task<IActionResult> RemoveFavoriteBoardAsync(int boardId, string uniqueId)
    {
        var success = await messageBoardServices.RemoveFavoriteBoardAsync(boardId, uniqueId);

        if (!success)
        {
            return BadRequest("Unable to remove favorite message board.");
        }

        return Ok();
    }

}
