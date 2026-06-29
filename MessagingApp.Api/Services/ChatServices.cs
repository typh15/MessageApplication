public class ChatServices : IChatServices
{
    private readonly IMessageBoardRepository messageBoardRepository;
    private readonly IActiveUserRepository activeUserRepository;
    private readonly IImageServices imageServices;
    private readonly IUserAccountRepository userAccountRepository;
    private readonly IPushNotificationServices pushNotificationServices;


    public ChatServices(IMessageBoardRepository messageBoardRepository, 
                        IActiveUserRepository activeUserRepository,
                        IImageServices imageServices,
                        IUserAccountRepository userAccountRepository,
                        IPushNotificationServices pushNotificationServices)
    {
        this.messageBoardRepository = messageBoardRepository;
        this.activeUserRepository = activeUserRepository;
        this.imageServices = imageServices;
        this.userAccountRepository = userAccountRepository;
        this.pushNotificationServices = pushNotificationServices;
    }

    public async Task<List<MessageBoardDataResponse>> GetMessageBoardsAsync(string uniqueId)
    {
        var boards = await messageBoardRepository.GetMessageBoardsAsync();
        var activeUser = await activeUserRepository.GetActiveUserByUniqueId(uniqueId);

        var visibleBoards = new List<MessageBoardDataResponse>();

        foreach (var board in boards)
        {
            board.IsFavorite = activeUser?.FavoriteMessageBoardIds.Contains(board.BoardId) == true;

            if (board.VisibleToPublic)
            {
                visibleBoards.Add(board);
                continue;
            }

            if (activeUser == null)
            {
                continue;
            }

            var userIsInBoard = await messageBoardRepository.CheckUserInBoardAsync(
                board.BoardId,
                activeUser);

            if (userIsInBoard)
            {
                visibleBoards.Add(board);
            }
        }

        return visibleBoards;
    }

    public async Task<MessageBoardDataResponse?> GetMessageBoardByIdAsync(int boardId, string uniqueId)
    {
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);


        if (board == null)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return null;
        }

        bool isUserActive = await activeUserRepository.IsUserActiveAsync(uniqueId);

        if (!isUserActive)
        {
            return null;
        }

        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var activeUser = activeUsers.FirstOrDefault(u => u.UniqueId == uniqueId);

        if (activeUser == null)
        {
            return null;
        }

        bool userIsAlreadyInBoard =
            await messageBoardRepository.CheckUserInBoardAsync(boardId, activeUser);

        if (!userIsAlreadyInBoard)
        {
            return null;
        }


        var boardData = await messageBoardRepository.GetMessageBoardDataByIdAsync(boardId);
        if (boardData != null)
        {
            boardData.IsFavorite = activeUser.FavoriteMessageBoardIds.Contains(boardId);
        }

        return boardData;
    }

    public async Task<MessageBoardDataResponse?> CreateMessageBoardAsync(string uniqueId, string boardName, bool visibleToPublic, bool passwordProtected, string password)
    {
        
        var boards = await messageBoardRepository.GetMessageBoardsAsync();
        
        var publicBoardNameExists = boards.Any(board =>
                    board.VisibleToPublic &&
                    string.Equals(board.BoardName, boardName, StringComparison.OrdinalIgnoreCase));
        if (visibleToPublic && publicBoardNameExists)
        {
            return null;
        }
        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var activeUser = activeUsers.FirstOrDefault(u => u.UniqueId == uniqueId);

        if (activeUser == null)
        {
            return null;
        }

        return await messageBoardRepository.CreateMessageBoardAsync(
            activeUser,
            boardName,
            visibleToPublic,
            passwordProtected,
            password
        );
    }

    public async Task<List<ActiveUser>> GetAllActiveUsersAsync()
    {
        return await activeUserRepository.GetAllActiveUsersAsync();
    }

    public async Task<List<String>> GetAllActiveUserNames()
    {
        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        return activeUsers.Select(u => u.UserName).ToList();
    }

    public async Task<List<ChatMessage>> GetMessagesForBoardAsync(int boardId)
    {
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);

        if (board == null)
        {
            return new List<ChatMessage>();
        }

        return board.ChatMessages.ToList();
    }

    public async Task<CreateActiveUserResponse?> CreateAnonymousActiveUserAsync(string userName, string userAddress)
    {
        string uniqueId = Guid.NewGuid().ToString();
        return await CreateActiveUserAsync(userName, userAddress, uniqueId);
    }

    public async Task<CreateActiveUserResponse?> CreateActiveUserAsync(string userName, string userAddress, string uniqueId)
    {
        bool doesUserNameExist = await activeUserRepository.DoesUserExistAsync(userName);
        
        if (doesUserNameExist)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(userName) || string.IsNullOrWhiteSpace(uniqueId))
        {
            return null;
        }
        
        var activeUser = new ActiveUser(
            userName,
            userAddress,
            DateTime.UtcNow,
            uniqueId
        );

        var activeUserWasAdded = await activeUserRepository.AddActiveUserAsync(activeUser);
        if (!activeUserWasAdded)
        {
            return null;
        }

        return new CreateActiveUserResponse(userName, uniqueId);
    }

    public async Task<CreateActiveUserResponse?> CreateOrRefreshActiveUserAsync(
        string userName,
        string userAddress,
        string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(userName) || string.IsNullOrWhiteSpace(uniqueId))
        {
            return null;
        }

        var activeUserByUniqueId = await activeUserRepository.GetActiveUserByUniqueId(uniqueId);
        if (activeUserByUniqueId != null)
        {
            activeUserByUniqueId.UserName = userName;
            activeUserByUniqueId.Address = userAddress;
            activeUserByUniqueId.LastActiveTime = DateTime.UtcNow;
            await activeUserRepository.UpdateActiveUserAsync(activeUserByUniqueId);
            return new CreateActiveUserResponse(userName, uniqueId);
        }

        var activeUserByUserName = await activeUserRepository.GetActiveUserByUserName(userName);
        if (activeUserByUserName != null)
        {
            if (!string.Equals(activeUserByUserName.UniqueId, uniqueId, StringComparison.Ordinal))
            {
                return null;
            }

            activeUserByUserName.Address = userAddress;
            activeUserByUserName.LastActiveTime = DateTime.UtcNow;
            await activeUserRepository.UpdateActiveUserAsync(activeUserByUserName);
            return new CreateActiveUserResponse(userName, uniqueId);
        }

        return await CreateActiveUserAsync(userName, userAddress, uniqueId);
    }

    public async Task<SendMessageResponse?> SendMessageToBoardAsync(int boardId, CreateChatMessageRequest request, string userAddress)
    {
        var uniqueId = request.UniqueId ?? "";
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);
        var userAccount = await userAccountRepository.GetUserAccountAsync(uniqueId);
        var activeUser = await activeUserRepository.GetActiveUserByUniqueId(uniqueId);
        string displayName;
        

        if (!(userAccount==null))
        {
            displayName = userAccount.DisplayName ?? "";
        }
        else
        {
            displayName = "";
        }
            
        if (board == null)
        {
            return null;
        }


        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return null;
        }

        bool isUserActive = await activeUserRepository.IsUserActiveAsync(uniqueId);

        if (!isUserActive)
        {
            return null;
        }


        if (activeUser == null)
        {
            return null;
        }

        activeUser.LastActiveTime = DateTime.UtcNow;
        activeUser.Address = userAddress;
        await activeUserRepository.UpdateActiveUserAsync(activeUser);

        bool userIsAlreadyInBoard =
            await messageBoardRepository.CheckUserInBoardAsync(boardId, activeUser);

        if (!userIsAlreadyInBoard)
        {
            return null;
        }

        int messageId = messageBoardRepository.GetNextMessageId(boardId);

        if (request.MessageType == MessageTypeEnum.image)
        {
            if (string.IsNullOrWhiteSpace(request.ImageId))
            {
                return null;
            }

            var image = await imageServices.GetImageAsync(request.ImageId);

            if (image == null)
            {
                return null;
            }

            if (image.OwnerUniqueId != uniqueId)
            {
                return null;
            }
        }

        if (request.MessageType == MessageTypeEnum.text)
        {
            request.ImageId = null;
        }

        var chatMessage = new ChatMessage(
            messageId,
            activeUser.UserName,
            displayName,
            boardId,
            request.LocalTimestamp,
            DateTime.UtcNow,
            request.Content,
            request.MessageType,
            request.ImageId
        );


        chatMessage.AssignGlobalId();

        bool messageWasAdded =
            await messageBoardRepository.AddMessageToBoardAsync(boardId, chatMessage);

        if (!messageWasAdded)
        {
            return null;
        }

        await pushNotificationServices.SendAsync(CreateMessagePushNotificationRequest(
            board,
            chatMessage,
            uniqueId));

        return new SendMessageResponse(uniqueId, chatMessage);
    }

    public async Task<bool> JoinBoardAsync(int boardId, string uniqueId, string userAddress, bool allowed)
    {
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);

        if (!allowed){
            return false;
        }

        if (board == null)
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return false;
        }

        bool isUserActive = await activeUserRepository.IsUserActiveAsync(uniqueId);

        if (!isUserActive)
        {
            return false;
        }

        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var activeUser = activeUsers.FirstOrDefault(u => u.UniqueId == uniqueId);

        if (activeUser == null)
        {
            return false;
        }

        activeUser.LastActiveTime = DateTime.UtcNow;
        activeUser.Address = userAddress;
        await activeUserRepository.UpdateActiveUserAsync(activeUser);

        bool userIsAlreadyInBoard = await messageBoardRepository.CheckUserInBoardAsync(boardId, activeUser);
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

    public async Task<bool> AddFavoriteBoardAsync(int boardId, string uniqueId)
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

        return await activeUserRepository.AddFavoriteBoardAsync(uniqueId, boardId);
    }

    public async Task<bool> RemoveFavoriteBoardAsync(int boardId, string uniqueId)
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

        return await activeUserRepository.RemoveFavoriteBoardAsync(uniqueId, boardId);
    }

    public async Task<bool> DeleteMessageAsync(string uniqueId, int boardId, int messageId)
    {
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);
        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var activeUser = activeUsers.FirstOrDefault(u => u.UniqueId == uniqueId);
        var message = await messageBoardRepository.GetMessageByIdAsync(boardId, messageId);

        if (board == null)
        {
            return false;
        }

        if (message == null)
        {
            return false;
        }

        if (activeUser == null)
        {
            return false;
        }

        var userIsInBoard = await messageBoardRepository.CheckUserInBoardAsync(boardId, activeUser);

        if (userIsInBoard)
        {
            if (message.FromUserName == activeUser.UserName)
            {
                return await messageBoardRepository.DeleteMessageAsync(boardId, messageId);
            }
        }

        return false;

        
    }

    public async Task<bool> CheckIfUserCanJoin(int boardId, string uniqueId, JoinBoardRequest request)
    {
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);
        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var activeUser = activeUsers.FirstOrDefault(u => u.UniqueId == uniqueId);

        if (board == null)
        {
            return false;
        }

        else
        {  
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
        
    }

    public async Task<bool> CheckIfUserCanRequest(RequestJoinBoardRequest request)
    {
        var board = await messageBoardRepository.GetMessageBoardByUIdAsync(request.UniqueBoardId);
        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var activeUser = activeUsers.FirstOrDefault(u => u.UniqueId == request.UniqueId);

        if (board == null)
        {
            return false;
        }

        else
        {   
            if (!board.PasswordProtected)
            {
                return true;
            }
            else
            {
                if (request.Password == null)
                {
                    return false;
                }
                else
                {
                    var correctPassword = await messageBoardRepository.CheckBoardPasswordAsync(board.BoardId, request.Password);
                    return correctPassword;
                }
            }
        }
        
    }

    public async Task<bool> AddUserToRequests(string uniqueBoardId, string uniqueId, string userAddress, bool allowed)
    {
        var board = await messageBoardRepository.GetMessageBoardByUIdAsync(uniqueBoardId);
        var user = await activeUserRepository.GetAllActiveUsersAsync();

        if (!allowed)
        {
            return false;
        }

        if (board == null)
        {
            return false;
        }
        var boardId = board.BoardId;

        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return false;
        }

        bool isUserActive = await activeUserRepository.IsUserActiveAsync(uniqueId);

        if (!isUserActive)
        {
            return false;
        }

        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var activeUser = activeUsers.FirstOrDefault(u => u.UniqueId == uniqueId);

        if (activeUser == null)
        {
            return false;
        }

        activeUser.LastActiveTime = DateTime.UtcNow;
        activeUser.Address = userAddress;
        await activeUserRepository.UpdateActiveUserAsync(activeUser);
        
        bool userIsAlreadyInBoard = await messageBoardRepository.CheckUserInBoardAsync(boardId, activeUser);
        bool userIsAlreadyInRequests = await messageBoardRepository.CheckUserInRequestedListAsync(boardId, activeUser);
        if (userIsAlreadyInBoard)
        {
            return false;
        }

        if (userIsAlreadyInRequests)
        {
            return false;
        }
        
        await messageBoardRepository.AddUserToRequestedListAsync(boardId, activeUser);
        return true;

        
    }

    public async Task<bool> ApproveUserJoinRequest(int boardId, string MemberUniqueId, string userName)
    {
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);

        if (board == null)
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(MemberUniqueId))
        {
            return false;
        }

        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();

        var reqestingUser = activeUsers.FirstOrDefault(u => u.UserName == userName);

        if (reqestingUser == null)
        {
            return false;
        }

        var userIsInRequestList =
            await messageBoardRepository.CheckUserInRequestedListAsync(boardId, reqestingUser);

        if (!userIsInRequestList)
        {
            return false;
        }

        bool isUserActive = await activeUserRepository.IsUserActiveAsync(MemberUniqueId);

        if (!isUserActive)
        {
            return false;
        }

        var activeMember = activeUsers.FirstOrDefault(u => u.UniqueId == MemberUniqueId);
        
        if (activeMember == null)
        {
            return false;
        }
        
        bool MemberIsAlreadyInBoard = await messageBoardRepository.CheckUserInBoardAsync(boardId, activeMember);
        bool userIsAlreadyInBoard = await messageBoardRepository.CheckUserInBoardAsync(boardId, reqestingUser);
        
        if (userIsAlreadyInBoard)
        {
            return false;
        }
        if (!MemberIsAlreadyInBoard)
        {
            return false;
        }

        var removedUser = await messageBoardRepository.RemoveUserFromRequestAsync(boardId, reqestingUser);
        await messageBoardRepository.RemoveUserFromInviteAsync(boardId, reqestingUser);
        var addedUser = await messageBoardRepository.AddUserToBoardAsync(boardId, reqestingUser);


        return removedUser && addedUser;
    }

    public async Task<bool> DenyUserJoinRequest(int boardId, string MemberUniqueId, string userName)
    {
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);

        if (board == null)
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(MemberUniqueId))
        {
            return false;
        }

        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();

        var reqestingUser = activeUsers.FirstOrDefault(u => u.UserName == userName);

        if (reqestingUser == null)
        {
            return false;
        }

        var userIsInRequestList =
            await messageBoardRepository.CheckUserInRequestedListAsync(boardId, reqestingUser);

        if (!userIsInRequestList)
        {
            return false;
        }

        bool isUserActive = await activeUserRepository.IsUserActiveAsync(MemberUniqueId);

        if (!isUserActive)
        {
            return false;
        }

        var activeMember = activeUsers.FirstOrDefault(u => u.UniqueId == MemberUniqueId);
        
        if (activeMember == null)
        {
            return false;
        }
        
        bool MemberIsAlreadyInBoard = await messageBoardRepository.CheckUserInBoardAsync(boardId, activeMember);
        bool userIsAlreadyInBoard = await messageBoardRepository.CheckUserInBoardAsync(boardId, reqestingUser);
        
        if (userIsAlreadyInBoard)
        {
            return false;
        }
        if (!MemberIsAlreadyInBoard)
        {
            return false;
        }

        var removedUserFromBoardRequests = await messageBoardRepository.RemoveUserFromRequestAsync(boardId, reqestingUser);
        var removedBoardFromUserRequests = await messageBoardRepository.RemoveUserFromInviteAsync(boardId, reqestingUser);


        return removedUserFromBoardRequests && removedBoardFromUserRequests;
    }

    public async Task<List<String>> GetPublicBoardNames()
    {
        
        var boards = await messageBoardRepository.GetMessageBoardsAsync();
        
        return boards.Where(board => board.VisibleToPublic)
                     .Select(board => board.BoardName)
                     .ToList();
    }

    public async Task<bool> IsUserActiveAsync(string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return false;
        }

        return await activeUserRepository.IsUserActiveAsync(uniqueId);
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
        string memberUniqueId
    )
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
        string inviteUserName
    )
    {
        if (string.IsNullOrWhiteSpace(memberUniqueId) || string.IsNullOrWhiteSpace(inviteUserName))
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
        var invitedUser = activeUsers.FirstOrDefault(user =>
            string.Equals(user.UserName, inviteUserName, StringComparison.OrdinalIgnoreCase)
        );

        if (member == null || invitedUser == null)
        {
            return false;
        }

        if (member.UniqueId == invitedUser.UniqueId)
        {
            return false;
        }

        var memberIsInBoard = await messageBoardRepository.CheckUserInBoardAsync(boardId, member);

        if (!memberIsInBoard)
        {
            return false;
        }

        var invitedUserIsAlreadyInBoard = await messageBoardRepository.CheckUserInBoardAsync(boardId, invitedUser);
        var invitedUserAlreadyInvited = await messageBoardRepository.CheckUserInInvitesListAsync(boardId, invitedUser);

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
                    board.UniqueBoardId
                ));
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

        var userIsInvited = await messageBoardRepository.CheckUserInInvitesListAsync(boardId, activeUser);

        if (!userIsInvited)
        {
            return false;
        }

        var userIsAlreadyInBoard = await messageBoardRepository.CheckUserInBoardAsync(boardId, activeUser);

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

        var userIsInvited = await messageBoardRepository.CheckUserInInvitesListAsync(boardId, activeUser);

        if (!userIsInvited)
        {
            return false;
        }

        await messageBoardRepository.RemoveUserFromRequestAsync(boardId, activeUser);
        return await messageBoardRepository.RemoveUserFromInviteAsync(boardId, activeUser);
    }

    public async Task<bool> JoinBoardByCodeAsync(string uniqueBoardId, string uniqueId, string password, string userAddress)
    {
        if (
            string.IsNullOrWhiteSpace(uniqueBoardId) ||
            string.IsNullOrWhiteSpace(uniqueId) ||
            string.IsNullOrWhiteSpace(password)
        )
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

    public async Task<List<AccountDataUserNamesResponse>> GetAllPublicProfiles()
    {
        var activeUsers = await activeUserRepository.GetAllActiveUsersAsync();
        var publicAccountDataList = new List<AccountDataUserNamesResponse>();
        foreach (ActiveUser user in activeUsers)
        {
            var uniqueId = user.UniqueId;
            var userName = user.UserName;
            if (!string.IsNullOrWhiteSpace(uniqueId))
            {
                var userAccountData = await userAccountRepository.GetUserAccountAsync(uniqueId);
                if (!(userAccountData==null))
                {
                    publicAccountDataList.Add(new AccountDataUserNamesResponse(
                        uniqueId,
                        userName,
                        userAccountData.DisplayName,
                        userAccountData.AvatarImageId,
                        userAccountData.PublicBlurb));
                }
            }
            
        }

        return publicAccountDataList;
    }

    public async Task<AccountDataUserNamesResponse?> GetPublicProfile(string userName)
    {
        var activeUser = await activeUserRepository.GetActiveUserByUserName(userName);
        if (!(activeUser == null) && !string.IsNullOrWhiteSpace(activeUser.UniqueId))
        {
            var uniqueId = activeUser.UniqueId;
            var userAccountData = await userAccountRepository.GetUserAccountAsync(uniqueId);
            if (!(userAccountData==null))
            {
                return new AccountDataUserNamesResponse(
                            uniqueId,
                            userName,
                            userAccountData.DisplayName,
                            userAccountData.AvatarImageId,
                            userAccountData.PublicBlurb);
            }
                
        }
        return null;
    }

    private static PushNotificationSendRequest CreateMessagePushNotificationRequest(
        MessageBoard board,
        ChatMessage chatMessage,
        string senderUniqueId)
    {
        var senderName = string.IsNullOrWhiteSpace(chatMessage.FromDisplayName)
            ? chatMessage.FromUserName
            : chatMessage.FromDisplayName;

        var messagePreview = GetMessageNotificationPreview(chatMessage);

        return new PushNotificationSendRequest(
            board.ActiveUsers.Select(user => user.UniqueId ?? ""),
            senderUniqueId,
            $"{senderName} in {board.BoardName}",
            messagePreview,
            new Dictionary<string, object?>
            {
                ["type"] = "message",
                ["boardId"] = board.BoardId,
                ["messageId"] = chatMessage.Id,
                ["url"] = $"/Chat-Page?boardId={board.BoardId}",
            });
    }

    private static string GetMessageNotificationPreview(ChatMessage chatMessage)
    {
        if (chatMessage.MessageType == MessageTypeEnum.image)
        {
            if (string.IsNullOrWhiteSpace(chatMessage.Content))
            {
                return "Sent a picture";
            }

            return TruncateNotificationText(chatMessage.Content);
        }

        return TruncateNotificationText(chatMessage.Content);
    }

    private static string TruncateNotificationText(string value)
    {
        const int maxLength = 140;

        if (value.Length <= maxLength)
        {
            return value;
        }

        return value.Substring(0, maxLength - 3) + "...";
    }
    
}
