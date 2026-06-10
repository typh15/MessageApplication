using Microsoft.AspNetCore.Identity;

public class ChatService : IChatService
{
    private readonly IMessageBoardRepository messageBoardRepository;
    private readonly IActiveUserRepository activeUserRepository;

    public ChatService(IMessageBoardRepository messageBoardRepository, IActiveUserRepository activeUserRepository)
    {
        this.messageBoardRepository = messageBoardRepository;
        this.activeUserRepository = activeUserRepository;
    }

    public async Task<List<MessageBoardDataResponse>> GetMessageBoardsAsync(string uniqueId)
    {
        var boards = await messageBoardRepository.GetMessageBoardsAsync();
        var activeUser = await activeUserRepository.GetActiveUserByUniqueId(uniqueId);

        return boards
            .Where(board =>
                board.VisibleToPublic ||
                activeUser?.MessageBoardIds.Contains(board.BoardId) == true)
            .ToList();
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


        return await messageBoardRepository.GetMessageBoardDataByIdAsync(boardId);
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

    public async Task<CreateActiveUserResponse?> CreateActiveUserAsync(string userName, string userAddress)
    {
        bool doesUserNameExist = await activeUserRepository.DoesUserExistAsync(userName);
        
        if (doesUserNameExist)
        {
            return null;
        }

        string uniqueId = Guid.NewGuid().ToString();
        
        var activeUser = new ActiveUser(
            userName,
            userAddress,
            DateTime.UtcNow,
            uniqueId
        );

        await activeUserRepository.AddActiveUserAsync(activeUser);

        return new CreateActiveUserResponse(userName, uniqueId);
    }

    public async Task<SendMessageResponse?> SendMessageToBoardAsync(int boardId, CreateChatMessageRequest request, string userAddress)
    {
        var board = await messageBoardRepository.GetMessageBoardByIdAsync(boardId);


        if (board == null)
        {
            return null;
        }

        string uniqueId = request.UniqueId ?? "";

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

        var chatMessage = new ChatMessage(
            messageId,
            request.FromUserName,
            boardId,
            request.LocalTimestamp,
            DateTime.UtcNow,
            request.Content
        );


        chatMessage.AssignGlobalId();

        bool messageWasAdded =
            await messageBoardRepository.AddMessageToBoardAsync(boardId, chatMessage);

        if (!messageWasAdded)
        {
            return null;
        }

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

    public async Task<bool> DeleteMessageAsync(int boardId, int messageId)
    {
        return await messageBoardRepository.DeleteMessageAsync(boardId, messageId);
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
            if (board.ActiveUsers.Contains(activeUser))
            {
                return true;
            }
            else
            {
                if (board.VisibleToPublic) {
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
                            var correctPassword = await messageBoardRepository.CheckBoardPasswordAsync(boardId, request.Password);
                            return correctPassword;
                        }
                    }
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
                            var correctPassword = await messageBoardRepository.CheckBoardPasswordAsync(boardId, request.Password);
                            return correctPassword;
                        }
                    }
                    
                }
            }
            
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

        if (!board.UserRequests.Contains(reqestingUser))
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
        
        if (reqestingUser == null)
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
        var addedUser = await messageBoardRepository.AddUserToBoardAsync(boardId, reqestingUser);

        return removedUser && addedUser;
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

        var invitedBoardIds = await activeUserRepository.GetAllInvitedBoardIds(uniqueId);
        var invites = new List<MessageBoardInviteResponse>();

        foreach (var boardId in invitedBoardIds)
        {
            var boardData = await messageBoardRepository.GetMessageBoardDataByIdAsync(boardId);

            if (boardData != null)
            {
                invites.Add(new MessageBoardInviteResponse(
                    boardData.BoardId,
                    boardData.BoardName,
                    boardData.UniqueBoardId
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
    
}
