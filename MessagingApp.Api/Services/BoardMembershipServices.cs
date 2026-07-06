public class BoardMembershipServices : IBoardMembershipServices
{
    private readonly IMessageBoardRepository messageBoardRepository;
    private readonly IActiveUserRepository activeUserRepository;
    private readonly IUserAccountRepository userAccountRepository;
    private readonly IChatbotBotUserService chatbotBotUserService;

    public BoardMembershipServices(
        IMessageBoardRepository messageBoardRepository,
        IActiveUserRepository activeUserRepository,
        IUserAccountRepository userAccountRepository,
        IChatbotBotUserService chatbotBotUserService)
    {
        this.messageBoardRepository = messageBoardRepository;
        this.activeUserRepository = activeUserRepository;
        this.userAccountRepository = userAccountRepository;
        this.chatbotBotUserService = chatbotBotUserService;
    }

    public async Task<bool> JoinBoardAsync(
        int boardId,
        string uniqueId,
        string userAddress,
        bool allowed)
    {
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);

        if (!allowed || board == null || string.IsNullOrWhiteSpace(uniqueId))
        {
            return false;
        }

        var isUserActive = await activeUserRepository.IsUserActiveAsync(uniqueId);
        if (!isUserActive)
        {
            return false;
        }

        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var activeUser = activeUsers.FirstOrDefault(user => user.UniqueId == uniqueId);
        if (activeUser == null)
        {
            return false;
        }

        activeUser.LastActiveTime = DateTime.UtcNow;
        activeUser.Address = userAddress;
        await activeUserRepository.UpdateActiveUserAsync(activeUser);

        var userIsAlreadyInBoard =
            await messageBoardRepository.CheckUserInBoardAsync(boardId, activeUser);

        if (!userIsAlreadyInBoard)
        {
            await messageBoardRepository.AddUserToBoardAsync(boardId, activeUser);
        }

        return true;
    }

    public async Task<bool> LeaveBoardAsync(int boardId, string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return false;
        }

        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);
        var activeUser = await activeUserRepository.GetActiveUserByUniqueId(uniqueId);

        if (board == null || activeUser == null)
        {
            return false;
        }

        var userIsInBoard = await messageBoardRepository.CheckUserInBoardAsync(boardId, activeUser);
        if (!userIsInBoard)
        {
            return false;
        }

        var removedFromBoard = await messageBoardRepository.RemoveUserFromBoardAsync(boardId, activeUser);
        if (removedFromBoard)
        {
            await activeUserRepository.RemoveFavoriteBoardAsync(uniqueId, boardId);
        }

        return removedFromBoard;
    }

    public async Task<bool> CheckIfUserCanJoin(
        int boardId,
        string uniqueId,
        JoinBoardRequest request)
    {
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);
        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var activeUser = activeUsers.FirstOrDefault(user => user.UniqueId == uniqueId);

        if (board == null)
        {
            return false;
        }

        if (activeUser != null &&
            await messageBoardRepository.CheckUserInBoardAsync(boardId, activeUser))
        {
            return true;
        }

        if (board.VisibleToPublic)
        {
            if (!board.PasswordProtected)
            {
                return true;
            }

            if (string.IsNullOrWhiteSpace(request.Password))
            {
                return false;
            }

            return await messageBoardRepository.CheckBoardPasswordAsync(boardId, request.Password);
        }

        if (!board.PasswordProtected)
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return false;
        }

        return await messageBoardRepository.CheckBoardPasswordAsync(boardId, request.Password);
    }

    public async Task<bool> CheckIfUserCanRequest(RequestJoinBoardRequest request)
    {
        var board = await messageBoardRepository.GetMessageBoardByUIdAsync(request.UniqueBoardId);

        if (board == null)
        {
            return false;
        }

        if (!board.PasswordProtected)
        {
            return true;
        }

        if (request.Password == null)
        {
            return false;
        }

        return await messageBoardRepository.CheckBoardPasswordAsync(
            board.BoardId,
            request.Password);
    }

    public async Task<bool> AddUserToRequests(
        string uniqueBoardId,
        string uniqueId,
        string userAddress,
        bool allowed)
    {
        var board = await messageBoardRepository.GetMessageBoardByUIdAsync(uniqueBoardId);

        if (!allowed || board == null || string.IsNullOrWhiteSpace(uniqueId))
        {
            return false;
        }

        var isUserActive = await activeUserRepository.IsUserActiveAsync(uniqueId);
        if (!isUserActive)
        {
            return false;
        }

        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var activeUser = activeUsers.FirstOrDefault(user => user.UniqueId == uniqueId);
        if (activeUser == null)
        {
            return false;
        }

        activeUser.LastActiveTime = DateTime.UtcNow;
        activeUser.Address = userAddress;
        await activeUserRepository.UpdateActiveUserAsync(activeUser);

        var boardId = board.BoardId;
        var userIsAlreadyInBoard =
            await messageBoardRepository.CheckUserInBoardAsync(boardId, activeUser);
        var userIsAlreadyInRequests =
            await messageBoardRepository.CheckUserInRequestedListAsync(boardId, activeUser);

        if (userIsAlreadyInBoard || userIsAlreadyInRequests)
        {
            return false;
        }

        await messageBoardRepository.AddUserToRequestedListAsync(boardId, activeUser);
        return true;
    }

    public async Task<bool> ApproveUserJoinRequest(
        int boardId,
        string memberUniqueId,
        string userName)
    {
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);

        if (board == null || string.IsNullOrWhiteSpace(memberUniqueId))
        {
            return false;
        }

        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var requestingUser = activeUsers.FirstOrDefault(user => user.UserName == userName);
        if (requestingUser == null)
        {
            return false;
        }

        var userIsInRequestList =
            await messageBoardRepository.CheckUserInRequestedListAsync(boardId, requestingUser);

        if (!userIsInRequestList)
        {
            return false;
        }

        var isUserActive = await activeUserRepository.IsUserActiveAsync(memberUniqueId);
        if (!isUserActive)
        {
            return false;
        }

        var activeMember = activeUsers.FirstOrDefault(user => user.UniqueId == memberUniqueId);
        if (activeMember == null)
        {
            return false;
        }

        var memberIsAlreadyInBoard =
            await messageBoardRepository.CheckUserInBoardAsync(boardId, activeMember);
        var userIsAlreadyInBoard =
            await messageBoardRepository.CheckUserInBoardAsync(boardId, requestingUser);

        if (userIsAlreadyInBoard || !memberIsAlreadyInBoard)
        {
            return false;
        }

        var removedUser = await messageBoardRepository.RemoveUserFromRequestAsync(
            boardId,
            requestingUser);
        await messageBoardRepository.RemoveUserFromInviteAsync(boardId, requestingUser);
        var addedUser = await messageBoardRepository.AddUserToBoardAsync(boardId, requestingUser);

        return removedUser && addedUser;
    }

    public async Task<bool> DenyUserJoinRequest(
        int boardId,
        string memberUniqueId,
        string userName)
    {
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);

        if (board == null || string.IsNullOrWhiteSpace(memberUniqueId))
        {
            return false;
        }

        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var requestingUser = activeUsers.FirstOrDefault(user => user.UserName == userName);
        if (requestingUser == null)
        {
            return false;
        }

        var userIsInRequestList =
            await messageBoardRepository.CheckUserInRequestedListAsync(boardId, requestingUser);

        if (!userIsInRequestList)
        {
            return false;
        }

        var isUserActive = await activeUserRepository.IsUserActiveAsync(memberUniqueId);
        if (!isUserActive)
        {
            return false;
        }

        var activeMember = activeUsers.FirstOrDefault(user => user.UniqueId == memberUniqueId);
        if (activeMember == null)
        {
            return false;
        }

        var memberIsAlreadyInBoard =
            await messageBoardRepository.CheckUserInBoardAsync(boardId, activeMember);
        var userIsAlreadyInBoard =
            await messageBoardRepository.CheckUserInBoardAsync(boardId, requestingUser);

        if (userIsAlreadyInBoard || !memberIsAlreadyInBoard)
        {
            return false;
        }

        var removedUserFromBoardRequests =
            await messageBoardRepository.RemoveUserFromRequestAsync(boardId, requestingUser);
        var removedBoardFromUserRequests =
            await messageBoardRepository.RemoveUserFromInviteAsync(boardId, requestingUser);

        return removedUserFromBoardRequests && removedBoardFromUserRequests;
    }

    public async Task<List<AccountDataUserNamesResponse>?> GetBoardMembersAsync(
        int boardId,
        string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return null;
        }

        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);
        var requestingUser = await activeUserRepository.GetActiveUserByUniqueId(uniqueId);

        if (board == null || requestingUser == null)
        {
            return null;
        }

        var requesterIsInBoard = await messageBoardRepository.CheckUserInBoardAsync(
            boardId,
            requestingUser);

        if (!requesterIsInBoard)
        {
            return null;
        }

        var members = new List<AccountDataUserNamesResponse>();

        foreach (var member in board.ActiveUsers.OrderBy(user => user.UserName))
        {
            if (string.IsNullOrWhiteSpace(member.UniqueId))
            {
                continue;
            }

            var accountData = await userAccountRepository.GetUserAccountAsync(member.UniqueId);

            members.Add(new AccountDataUserNamesResponse(
                member.UniqueId,
                member.UserName,
                accountData?.DisplayName,
                accountData?.AvatarImageId,
                accountData?.PublicBlurb));
        }

        return members;
    }

    public async Task<List<JoinBoardRequestDisplay>?> GetBoardJoinRequestsAsync(
        int boardId,
        string memberUniqueId)
    {
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);

        if (board == null)
        {
            return null;
        }

        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var member = activeUsers.FirstOrDefault(user => user.UniqueId == memberUniqueId);
        if (member == null)
        {
            return null;
        }

        var memberIsInBoard = await messageBoardRepository.CheckUserInBoardAsync(boardId, member);

        if (!memberIsInBoard)
        {
            return null;
        }

        return board.UserRequests
            .Select(user => new JoinBoardRequestDisplay(user.UserName, user.UniqueId))
            .ToList();
    }

    public async Task<bool> InviteUserJoinRequest(
        int boardId,
        string memberUniqueId,
        string inviteUserName)
    {
        if (string.IsNullOrWhiteSpace(memberUniqueId) ||
            string.IsNullOrWhiteSpace(inviteUserName))
        {
            return false;
        }

        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);

        if (board == null)
        {
            return false;
        }

        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var member = activeUsers.FirstOrDefault(user => user.UniqueId == memberUniqueId);

        if (member == null)
        {
            return false;
        }

        var memberIsInBoard = await messageBoardRepository.CheckUserInBoardAsync(boardId, member);

        if (!memberIsInBoard)
        {
            return false;
        }

        if (chatbotBotUserService.IsConfiguredBotUserName(inviteUserName))
        {
            return await AddConfiguredBotToBoardAsync(boardId, member);
        }

        var invitedUser = activeUsers.FirstOrDefault(user =>
            string.Equals(user.UserName, inviteUserName, StringComparison.OrdinalIgnoreCase));

        if (invitedUser == null)
        {
            return false;
        }

        if (member.UniqueId == invitedUser.UniqueId)
        {
            return false;
        }

        var invitedUserIsAlreadyInBoard =
            await messageBoardRepository.CheckUserInBoardAsync(boardId, invitedUser);
        var invitedUserAlreadyInvited =
            await messageBoardRepository.CheckUserInInvitesListAsync(boardId, invitedUser);

        if (invitedUserIsAlreadyInBoard || invitedUserAlreadyInvited)
        {
            return false;
        }

        return await messageBoardRepository.AddUserToInvitesListAsync(boardId, invitedUser);
    }

    public async Task<List<MessageBoardInviteResponse>?> GetUserInvitesAsync(string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return null;
        }

        var activeUser = await activeUserRepository.GetActiveUserByUniqueId(uniqueId);

        if (activeUser == null)
        {
            return null;
        }

        var boards = await messageBoardRepository.GetMessageBoardsAsync();
        var invites = new List<MessageBoardInviteResponse>();

        foreach (var board in boards)
        {
            var userIsInvited = await messageBoardRepository.CheckUserInInvitesListAsync(
                board.BoardId,
                activeUser);

            if (userIsInvited)
            {
                invites.Add(new MessageBoardInviteResponse(
                    board.BoardId,
                    board.BoardName,
                    board.UniqueBoardId));
            }
        }

        return invites;
    }

    public async Task<bool> AcceptBoardInvite(int boardId, string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return false;
        }

        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);
        var activeUser = await activeUserRepository.GetActiveUserByUniqueId(uniqueId);

        if (board == null || activeUser == null)
        {
            return false;
        }

        var userIsInvited =
            await messageBoardRepository.CheckUserInInvitesListAsync(boardId, activeUser);

        if (!userIsInvited)
        {
            return false;
        }

        var userIsAlreadyInBoard =
            await messageBoardRepository.CheckUserInBoardAsync(boardId, activeUser);

        if (!userIsAlreadyInBoard)
        {
            var added = await messageBoardRepository.AddUserToBoardAsync(boardId, activeUser);

            if (!added)
            {
                return false;
            }
        }

        await messageBoardRepository.RemoveUserFromRequestAsync(boardId, activeUser);
        return await messageBoardRepository.RemoveUserFromInviteAsync(boardId, activeUser);
    }

    public async Task<bool> RejectBoardInvite(int boardId, string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return false;
        }

        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);
        var activeUser = await activeUserRepository.GetActiveUserByUniqueId(uniqueId);

        if (board == null || activeUser == null)
        {
            return false;
        }

        var userIsInvited =
            await messageBoardRepository.CheckUserInInvitesListAsync(boardId, activeUser);

        if (!userIsInvited)
        {
            return false;
        }

        await messageBoardRepository.RemoveUserFromRequestAsync(boardId, activeUser);
        return await messageBoardRepository.RemoveUserFromInviteAsync(boardId, activeUser);
    }

    public async Task<bool> JoinBoardByCodeAsync(
        string uniqueBoardId,
        string uniqueId,
        string password,
        string userAddress)
    {
        if (string.IsNullOrWhiteSpace(uniqueBoardId) ||
            string.IsNullOrWhiteSpace(uniqueId) ||
            string.IsNullOrWhiteSpace(password))
        {
            return false;
        }

        var board = await messageBoardRepository.GetMessageBoardByUIdAsync(uniqueBoardId);
        var activeUser = await activeUserRepository.GetActiveUserByUniqueId(uniqueId);

        if (board == null || activeUser == null)
        {
            return false;
        }

        if (!board.PasswordProtected)
        {
            return false;
        }

        var passwordIsCorrect =
            await messageBoardRepository.CheckBoardPasswordAsync(board.BoardId, password);

        if (!passwordIsCorrect)
        {
            return false;
        }

        activeUser.LastActiveTime = DateTime.UtcNow;
        activeUser.Address = userAddress;
        await activeUserRepository.UpdateActiveUserAsync(activeUser);

        var userIsAlreadyInBoard =
            await messageBoardRepository.CheckUserInBoardAsync(board.BoardId, activeUser);

        if (userIsAlreadyInBoard)
        {
            return true;
        }

        return await messageBoardRepository.AddUserToBoardAsync(board.BoardId, activeUser);
    }

    private async Task<bool> AddConfiguredBotToBoardAsync(int boardId, ActiveUser member)
    {
        var botUser = await chatbotBotUserService.EnsureBotUserAsync();
        if (botUser == null ||
            string.Equals(member.UniqueId, botUser.UniqueId, StringComparison.Ordinal))
        {
            return false;
        }

        var botIsAlreadyInBoard = await messageBoardRepository.CheckUserInBoardAsync(
            boardId,
            botUser);

        if (botIsAlreadyInBoard)
        {
            return true;
        }

        return await messageBoardRepository.AddUserToBoardAsync(boardId, botUser);
    }
}
