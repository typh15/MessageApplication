using Microsoft.AspNetCore.Mvc;

[ApiController]
public class ActiveUsersController : ControllerBase
{
    private readonly IActiveUserServices activeUserServices;
    private readonly IPublicProfileServices publicProfileServices;


    public ActiveUsersController(
        IActiveUserServices activeUserServices,
        IPublicProfileServices publicProfileServices)
    {
        this.activeUserServices = activeUserServices;
        this.publicProfileServices = publicProfileServices;
    }

    
    
    [HttpPost("/anonymous-users")]
    public async Task<IActionResult> CreateAnonymousActiveUserAsync(
        [FromBody] CreateActiveUserRequest request)
    {
        var userAddress =
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

        var result = await activeUserServices.CreateAnonymousActiveUserAsync(
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

        var result = await activeUserServices.GetAllActiveUserNames();
        


        if (result == null)
        {
            return Ok(new List<String>());
        }

        return Ok(result);
    }

    [HttpGet("/public-profiles")]
    public async Task<IActionResult> GetAllPublicProfiles()
    {

        var result = await publicProfileServices.GetAllPublicProfiles();


        if (result == null)
        {
            return Ok(new List<AccountDataUserNamesResponse>());
        }

        return Ok(result);
    }

    [HttpGet("/public-profiles/{userName}")]
    public async Task<IActionResult> GetPublicProfile(string userName)
    {

        var result = await publicProfileServices.GetPublicProfile(userName);


        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }


    [HttpGet("/active-users/validate")]
    public async Task<IActionResult> ValidateActiveUserAsync(string uniqueId)
    {
        var isActive = await activeUserServices.IsUserActiveAsync(uniqueId);
        return Ok(isActive);
    }




}
