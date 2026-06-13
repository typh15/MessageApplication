using Microsoft.AspNetCore.Mvc;

[ApiController]
public class UserAccountsController : ControllerBase
{
    private readonly IAccountServices accountServices;

    public UserAccountsController(IAccountServices accountServices)
    {
        this.accountServices = accountServices;
    }

    [HttpPost("/user-accounts")]
    public async Task<IActionResult> CreateUserAccountAsync(
        [FromBody] CreateUserAccount request)
    {
        var account = await accountServices.CreateUserAccountAsync(request);

        if (account == null)
        {
            return BadRequest("Unable to create user account.");
        }

        return Ok(account);
    }

    [HttpGet("/user-accounts/{uniqueId}")]
    public async Task<IActionResult> GetUserAccountAsync(string uniqueId)
    {
        var account = await accountServices.GetUserAccountAsync(uniqueId);

        if (account == null)
        {
            return NotFound("User account was not found.");
        }

        return Ok(account);
    }

    [HttpPut("/user-accounts/{uniqueId}/display-name")]
    public async Task<IActionResult> UpdateDisplayNameAsync(
        string uniqueId,
        [FromBody] UpdateAccountDataRequest request)
    {
        if (request == null)
        {
            return BadRequest("Account update data is required.");
        }

        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            return BadRequest("Display name is required.");
        }

        var updated = await accountServices.UpdateDisplayNameAsync(
            uniqueId,
            request.DisplayName);

        if (!updated)
        {
            return BadRequest("Unable to update display name.");
        }

        return Ok();
    }

    [HttpPut("/user-accounts/{uniqueId}/public-blurb")]
    public async Task<IActionResult> UpdatePublicBlurbAsync(
        string uniqueId,
        [FromBody] UpdateAccountDataRequest request)
    {
        if (request == null)
        {
            return BadRequest("Account update data is required.");
        }

        if (request.PublicBlurb == null)
        {
            return BadRequest("Public blurb is required.");
        }

        var updated = await accountServices.UpdatePublicTextAsync(
            uniqueId,
            request.PublicBlurb);

        if (!updated)
        {
            return BadRequest("Unable to update public blurb.");
        }

        return Ok();
    }

    [HttpPut("/user-accounts/{uniqueId}/avatar")]
    public async Task<IActionResult> UpdateAvatarImageAsync(
        string uniqueId,
        [FromBody] UpdateAccountDataRequest request)
    {
        if (request == null)
        {
            return BadRequest("Account update data is required.");
        }

        if (string.IsNullOrWhiteSpace(request.AvatarImageId))
        {
            return BadRequest("Avatar image ID is required.");
        }

        var updated = await accountServices.UpdateAvatarImageAsync(
            uniqueId,
            request.AvatarImageId);

        if (!updated)
        {
            return BadRequest("Unable to update avatar image.");
        }

        return Ok();
    }
}
