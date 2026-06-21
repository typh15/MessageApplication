using Microsoft.AspNetCore.Mvc;

[ApiController]
public class BoardMembershipController : ControllerBase
{
    private readonly IChatServices chatService;

    public BoardMembershipController(IChatServices chatService)
    {
        this.chatService = chatService;
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

    [HttpPost("/message-boards/{boardId}/denials")]
    public async Task<IActionResult> AttemptMessageBoardDenialAsync(
        int boardId,
        string memberUniqueId,
        string userName)
    {   
        var success = await chatService.DenyUserJoinRequest(
            boardId,
            memberUniqueId,
            userName
        );

        if (!success)
        {
            return BadRequest("Unable to deny message board join request.");
        }

        return Ok();
    }

    [HttpGet("/message-boards/{boardId}/requests")]
    public async Task<IActionResult> GetBoardJoinRequestsAsync(
        int boardId,
        string memberUniqueId)
    {
        var requests = await chatService.GetBoardJoinRequestsAsync(boardId, memberUniqueId);

        if (requests == null)
        {
            return BadRequest("Unable to load join requests.");
        }

        return Ok(requests);
    }

    [HttpPost("/message-boards/{boardId}/invites")]
    public async Task<IActionResult> AttemptMessageBoardInviteAsync(
        int boardId,
        string memberUniqueId,
        string inviteUserName)
    {   
        var success = await chatService.InviteUserJoinRequest(
            boardId,
            memberUniqueId,
            inviteUserName
        );

        if (!success)
        {
            return BadRequest("Unable to invite user to message board.");
        }

        return Ok();
    }


    [HttpGet("/active-users/{uniqueId}/invites")]
    public async Task<IActionResult> GetUserInvitesAsync(string uniqueId)
    {
        var invites = await chatService.GetUserInvitesAsync(uniqueId);

        if (invites == null)
        {
            return BadRequest("Unable to load invitations.");
        }

        return Ok(invites);
    }

    [HttpPost("/message-boards/{boardId}/invites/accept")]
    public async Task<IActionResult> AcceptMessageBoardInviteAsync(
        int boardId,
        string uniqueId)
        {
        var success = await chatService.AcceptBoardInvite(
            boardId,
            uniqueId
        );

        if (!success)
        {
            return BadRequest("Unable to accept board invite.");
        }

        return Ok();
    }

    [HttpPost("/message-boards/{boardId}/invites/reject")]
    public async Task<IActionResult> RejectMessageBoardInviteAsync(
        int boardId,
        string uniqueId)
        {
        var success = await chatService.RejectBoardInvite(
            boardId,
            uniqueId
        );

        if (!success)
        {
            return BadRequest("Unable to reject board invite.");
        }

        return Ok();
    }

    [HttpPost("/message-boards/join-by-code")]
    public async Task<IActionResult> JoinMessageBoardByCodeAsync(
        [FromBody] JoinBoardByCodeRequest request)
    {
        var userAddress =
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

        var success = await chatService.JoinBoardByCodeAsync(
            request.UniqueBoardId,
            request.UniqueId,
            request.Password,
            userAddress
        );

        if (!success)
        {
            return BadRequest("Unable to join message board.");
        }

        return Ok();
    }


}