using Microsoft.AspNetCore.Mvc;

[ApiController]
public class ActiveUsersController : ControllerBase
{
    private readonly IChatServices chatService;


    public ActiveUsersController(IChatServices chatService)
    {
        this.chatService = chatService;
    }

    
    
    [HttpPost("/anonymous-users")]
    public async Task<IActionResult> CreateAnonymousActiveUserAsync(
        [FromBody] CreateActiveUserRequest request)
    {
        var userAddress =
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

        var result = await chatService.CreateAnonymousActiveUserAsync(
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


    [HttpGet("/active-users/validate")]
    public async Task<IActionResult> ValidateActiveUserAsync(string uniqueId)
    {
        var isActive = await chatService.IsUserActiveAsync(uniqueId);
        return Ok(isActive);
    }




}