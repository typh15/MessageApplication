using Microsoft.AspNetCore.Mvc;

[ApiController]
public class BoardMembershipController : ControllerBase
{
    private readonly IBoardMembershipServices boardMembershipServices;

    public BoardMembershipController(IBoardMembershipServices boardMembershipServices)
    {
        this.boardMembershipServices = boardMembershipServices;
    }

    
    
    [HttpPost("/message-boards/{boardId}/join")]
    public async Task<IActionResult> JoinMessageBoardAsync(
        int boardId,
        [FromBody] JoinBoardRequest request)
    {   
        
        var userAddress =
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

        var canJoin = await boardMembershipServices.CheckIfUserCanJoin(boardId, request.UniqueId, request);

        var success = await boardMembershipServices.JoinBoardAsync(
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

    [HttpDelete("/message-boards/{boardId}/memberships/self")]
    public async Task<IActionResult> LeaveMessageBoardAsync(
        int boardId,
        string uniqueId)
    {
        var success = await boardMembershipServices.LeaveBoardAsync(boardId, uniqueId);

        if (!success)
        {
            return BadRequest("Unable to leave message board.");
        }

        return Ok();
    }

    [HttpPost("/message-boards/search")]
    public async Task<IActionResult> RequestJoinMessageBoardAsync(
        [FromBody] RequestJoinBoardRequest request)
    {   
        var userAddress =
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

        var canRequest = await boardMembershipServices.CheckIfUserCanRequest(request);

        var success = await boardMembershipServices.AddUserToRequests(
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
        var success = await boardMembershipServices.ApproveUserJoinRequest(
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
        var success = await boardMembershipServices.DenyUserJoinRequest(
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
        var requests = await boardMembershipServices.GetBoardJoinRequestsAsync(boardId, memberUniqueId);

        if (requests == null)
        {
            return BadRequest("Unable to load join requests.");
        }

        return Ok(requests);
    }

    [HttpGet("/message-boards/{boardId}/members")]
    public async Task<IActionResult> GetBoardMembersAsync(
        int boardId,
        string uniqueId)
    {
        var members = await boardMembershipServices.GetBoardMembersAsync(boardId, uniqueId);

        if (members == null)
        {
            return BadRequest("Unable to load board members.");
        }

        return Ok(members);
    }

    [HttpPost("/message-boards/{boardId}/invites")]
    public async Task<IActionResult> AttemptMessageBoardInviteAsync(
        int boardId,
        string memberUniqueId,
        string inviteUserName)
    {   
        var success = await boardMembershipServices.InviteUserJoinRequest(
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
        var invites = await boardMembershipServices.GetUserInvitesAsync(uniqueId);

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
        var success = await boardMembershipServices.AcceptBoardInvite(
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
        var success = await boardMembershipServices.RejectBoardInvite(
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

        var success = await boardMembershipServices.JoinBoardByCodeAsync(
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
