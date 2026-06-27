using Microsoft.AspNetCore.Mvc;

[ApiController]
public class RegistrationController : ControllerBase
{
    private const int MinimumPasswordLength = 8;
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

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < MinimumPasswordLength)
        {
            return BadRequest($"Password must be at least {MinimumPasswordLength} characters.");
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
                AuthId = userName,
                Password = request.Password,
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

    [HttpPost("/login")]
    public async Task<IActionResult> LoginUserAsync(
        [FromBody] LoginUserRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.UserName))
        {
            return BadRequest("Username is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("Password is required.");
        }

        var userName = request.UserName.Trim();
        var account = await accountServices.AuthenticateUserAccountAsync(
            userName,
            request.Password);

        if (account == null)
        {
            return Unauthorized("Invalid username or password.");
        }

        var userAddress =
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

        var activeUser = await chatServices.CreateOrRefreshActiveUserAsync(
            userName,
            userAddress,
            account.UniqueId
        );

        if (activeUser == null)
        {
            return BadRequest("Unable to start user session.");
        }

        return Ok(new RegisterUserResponse(
            activeUser.UserName,
            activeUser.UniqueId,
            account
        ));
    }
}
