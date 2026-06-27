using Microsoft.AspNetCore.Mvc;

[ApiController]
public class ActiveUsersController : ControllerBase
{
    private readonly IChatServices chatService;
    private readonly IAccountServices accountServices;


    public ActiveUsersController(IChatServices chatService, IAccountServices accountServices)
    {
        this.chatService = chatService;
        this.accountServices = accountServices;
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

    [HttpGet("/public-profiles")]
    public async Task<IActionResult> GetAllPublicProfiles()
    {

        var result = await chatService.GetAllPublicProfiles();


        if (result == null)
        {
            return Ok(new List<AccountDataUserNamesResponse>());
        }

        return Ok(result);
    }

    [HttpGet("/public-profiles/{userName}")]
    public async Task<IActionResult> GetPublicProfile(string userName)
    {

        var result = await chatService.GetPublicProfile(userName);


        if (result == null)
        {
            return NotFound();
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
