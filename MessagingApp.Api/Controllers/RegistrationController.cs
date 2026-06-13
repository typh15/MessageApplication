using Microsoft.AspNetCore.Mvc;

[ApiController]
public class RegistrationController : ControllerBase
{
    private readonly IChatServices chatServices;
    private readonly IAccountServices accountServices;

    public RegistrationController(
        IChatServices chatServices,
        IAccountServices accountServices)
    {
        this.chatServices = chatServices;
        this.accountServices = accountServices;
    }

    [HttpPost("/registration")]
    public async Task<IActionResult> RegisterUserAsync(
        [FromBody] RegisterUserRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.UserName))
        {
            return BadRequest("Username is required.");
        }

        var userName = request.UserName.Trim();
        var activeUserNames = await chatServices.GetAllActiveUserNames();

        var userNameExists = activeUserNames.Any(existingName =>
            string.Equals(existingName, userName, StringComparison.OrdinalIgnoreCase)
        );

        if (userNameExists)
        {
            return BadRequest("Username already exists.");
        }

        var uniqueId = Guid.NewGuid().ToString();
        var userAddress =
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

        var account = await accountServices.CreateUserAccountAsync(
            new CreateUserAccount
            {
                UniqueId = uniqueId,
                AuthId = uniqueId,
                DisplayName = userName
            }
        );

        if (account == null)
        {
            return BadRequest("Unable to create user account.");
        }

        var activeUser = await chatServices.CreateActiveUserAsync(
            userName,
            userAddress,
            uniqueId
        );

        if (activeUser == null)
        {
            return BadRequest("Unable to create active user.");
        }

        return Ok(new RegisterUserResponse(
            activeUser.UserName,
            activeUser.UniqueId,
            account
        ));
    }
}
