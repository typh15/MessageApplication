using Microsoft.AspNetCore.Mvc;

[ApiController]
public class UserAccountsController : ControllerBase
{
    private readonly IAccountServices accountServices;
    private readonly IAccountDataDeletionServices accountDataDeletionServices;

    public UserAccountsController(
        IAccountServices accountServices,
        IAccountDataDeletionServices accountDataDeletionServices)
    {
        this.accountServices = accountServices;
        this.accountDataDeletionServices = accountDataDeletionServices;
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

    [HttpDelete("/user-accounts/{uniqueId}")]
    public async Task<IActionResult> DeleteUserAccountAsync(string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return BadRequest("User account ID is required.");
        }

        var account = await accountServices.GetUserAccountAsync(uniqueId);
        if (account == null)
        {
            return NotFound("User account was not found.");
        }

        var primaryDataDeleted =
            await accountDataDeletionServices.DeletePrimaryAccountDataAsync(uniqueId);

        if (!primaryDataDeleted)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Unable to delete primary account data.");
        }

        var accountDeleted = await accountServices.DeleteUserAccountAsync(uniqueId);
        if (!accountDeleted)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "Unable to delete user account.");
        }

        return Ok(new DeleteUserAccountResponse(accountDeleted, primaryDataDeleted));
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
