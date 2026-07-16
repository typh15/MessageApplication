using Microsoft.AspNetCore.Identity;

class MessageBoardRepository : IMessageBoardRepository
{
    private readonly List<MessageBoard> messageBoards = new List<MessageBoard>();
    private readonly List<MessageBoardDataResponse> dataResponse = new List<MessageBoardDataResponse>();
    private readonly object messageWriteLock = new object();
    private readonly PasswordHasher<MessageBoard> passwordHasher = new PasswordHasher<MessageBoard>();

    public int GetNextBoardId()
    {
        return messageBoards.Count > 0 ? messageBoards.Max(a => a.BoardId) + 1 : 1;
    }

    public Task<MessageBoardDataResponse?> CreateMessageBoardAsync(ActiveUser user, string boardName, bool visibleToPublic, bool passwordProtected, string password)
    {

        var newBoardId = GetNextBoardId();
        var newUniqueBoardId = IdGenerator.Get8CharId();
        user.MessageBoardIds.Add(newBoardId);
        var newBoard = new MessageBoard(
            newBoardId,
            boardName,
            [user],
            Array.Empty<ChatMessage>(),
            visibleToPublic,
            passwordProtected,
            string.Empty,
            Array.Empty<ActiveUser>(),
            Array.Empty<ActiveUser>(),
            newUniqueBoardId
        );
        newBoard.PasswordHash = passwordHasher.HashPassword(newBoard, password);
        var newDataResponse = new MessageBoardDataResponse(
            newBoardId,
            boardName,
            visibleToPublic,
            passwordProtected,
            newUniqueBoardId
        );


        dataResponse.Add(newDataResponse);
        messageBoards.Add(newBoard);
        return Task.FromResult<MessageBoardDataResponse?>(newDataResponse);
    }

    public Task<List<MessageBoardDataResponse>> GetMessageBoardsAsync()
    {
        return Task.FromResult(dataResponse.ToList());
    }

    public Task<MessageBoard?> GetMessageBoardByIdAsync(int id)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == id);
        return Task.FromResult(messageBoard);
    }

    public Task<MessageBoard?> GetMessageBoardByNameAsync(string name)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardName == name);
        return Task.FromResult(messageBoard);
    }

    public Task<MessageBoard?> GetMessageBoardByUIdAsync(string uniqueBoardId)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.UniqueBoardId == uniqueBoardId);
        return Task.FromResult(messageBoard);
    }

    public Task<MessageBoardDataResponse?> GetMessageBoardDataByIdAsync(int id)
    {
        var messageBoardData = dataResponse.FirstOrDefault(a => a.BoardId == id);
        return Task.FromResult(messageBoardData);
    }

    public Task<ChatMessage?> GetMessageByIdAsync(int boardid, int id)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
        if (messageBoard != null)
        {
            var chatMessage = messageBoard.ChatMessages.FirstOrDefault(m => m.Id == id);
            return Task.FromResult(chatMessage);
        }
        return Task.FromResult<ChatMessage?>(null);
    }

    public Task<AppendMessageToBoardResult> AppendMessageToBoardAsync(
        int boardid,
        string fromUserName,
        string fromDisplayName,
        DateTime clientTimestamp,
        DateTime serverTimestamp,
        string content,
        MessageTypeEnum messageType,
        string? imageId)
    {
        lock (messageWriteLock)
        {
            var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
            if (messageBoard == null)
            {
                return Task.FromResult(AppendMessageToBoardResult.Failure(
                    AppendMessageToBoardFailureReason.BoardNotFound,
                    $"Message board {boardid} was not found."));
            }

            var messageId = messageBoard.ChatMessages.Length > 0
                ? messageBoard.ChatMessages.Max(m => m.Id) + 1
                : 1;

            var newChatMessage = new ChatMessage(
                messageId,
                fromUserName,
                fromDisplayName,
                boardid,
                clientTimestamp,
                serverTimestamp,
                content,
                messageType,
                imageId);

            newChatMessage.AssignGlobalId();
            messageBoard.ChatMessages = messageBoard.ChatMessages.Append(newChatMessage).ToArray();
            messageBoard.MostRecentMessageHash = newChatMessage.Hash;

            return Task.FromResult(AppendMessageToBoardResult.Success(newChatMessage));
        }
    }

    public Task<bool> UpdateBoardNameAsync(int boardid, string newName)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
        var boardDataRespose = dataResponse.FirstOrDefault(a => a.BoardId == boardid);
        if (messageBoard != null)
        {
            messageBoard.BoardName = newName;
            if (boardDataRespose != null)
            {
                boardDataRespose.BoardName = newName;
            }
            return Task.FromResult(true);
        }
        return Task.FromResult(false);
    }

    public Task<bool> DeleteMessageBoardAsync(int boardid)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
        var boardDataRespose = dataResponse.FirstOrDefault(a => a.BoardId == boardid);
        if (messageBoard != null)
        {
            for (int i = 0; i < messageBoard.ActiveUsers.Length; i++)
            {
                var user = messageBoard.ActiveUsers[i];
                user.MessageBoardIds.Remove(boardid);
                user.FavoriteMessageBoardIds.Remove(boardid);
            }
            for (int i = 0; i < messageBoard.UserRequests.Length; i++)
            {
                var user = messageBoard.UserRequests[i];
                user.RequestedMessageBoardIds.Remove(boardid);
            }
            for (int i = 0; i < messageBoard.UserInvites.Length; i++)
            {
                var user = messageBoard.UserInvites[i];
                user.InvitedMessageBoardIds.Remove(boardid);
            }

            messageBoards.Remove(messageBoard);
            if (boardDataRespose != null)
            {
                dataResponse.Remove(boardDataRespose);
            }
            
            return Task.FromResult(true);

        }
        return Task.FromResult(false);
    }

    public Task<bool> AddUserToBoardAsync(int boardid, ActiveUser user)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
        if (messageBoard != null)
        {
            if (!messageBoard.ActiveUsers.Any(u => u.UserName == user.UserName))
            {
                messageBoard.ActiveUsers = messageBoard.ActiveUsers.Append(user).ToArray();
                user.MessageBoardIds.Add(boardid);

                return Task.FromResult(true);
            }
        }
        return Task.FromResult(false);
    }

    public Task<bool> RemoveUserFromBoardAsync(int boardid, ActiveUser user)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
        if (messageBoard != null)
        {
            var existingUser = messageBoard.ActiveUsers.FirstOrDefault(u => u.UserName == user.UserName);
            if (existingUser != null)
            {
                messageBoard.ActiveUsers = messageBoard.ActiveUsers.Where(u => u.UserName != user.UserName).ToArray();
                user.MessageBoardIds.Remove(boardid);

                return Task.FromResult(true);
            }
        }
        return Task.FromResult(false);
    }

    public Task<bool> RemoveUserFromRequestAsync(int boardid, ActiveUser user)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
        if (messageBoard != null)
        {
            var existingUser = messageBoard.UserRequests.FirstOrDefault(u => u.UserName == user.UserName);
            if (existingUser != null)
            {
                messageBoard.UserRequests = messageBoard.UserRequests.Where(u => u.UserName != user.UserName).ToArray();
                user.RequestedMessageBoardIds.Remove(boardid);

                return Task.FromResult(true);
            }
        }
        return Task.FromResult(false);
    }

    public Task<bool> RemoveUserFromInviteAsync(int boardid, ActiveUser user)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
        if (messageBoard != null)
        {
            var existingUser = messageBoard.UserInvites.FirstOrDefault(u => u.UniqueId == user.UniqueId);
            if (existingUser != null)
            {
                messageBoard.UserInvites = messageBoard.UserInvites.Where(u => u.UniqueId != user.UniqueId).ToArray();
                user.InvitedMessageBoardIds.Remove(boardid);

                return Task.FromResult(true);
            }
        }
        return Task.FromResult(false);
    }

    public Task<bool> DeleteMessageAsync(int boardid, int messageid)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
        if (messageBoard != null)
        {
            var existingMessage = messageBoard.ChatMessages.FirstOrDefault(m => m.Id == messageid);
            if (existingMessage != null)
            {
                messageBoard.ChatMessages = messageBoard.ChatMessages.Where(m => m.Id != messageid).ToArray();
                return Task.FromResult(true);
            }
        }
        return Task.FromResult(false);
    }

    public Task<bool> DeleteUserBoardDataAsync(ActiveUser user)
    {
        if (user == null ||
            string.IsNullOrWhiteSpace(user.UniqueId) ||
            string.IsNullOrWhiteSpace(user.UserName))
        {
            return Task.FromResult(false);
        }

        foreach (var messageBoard in messageBoards)
        {
            messageBoard.ActiveUsers = messageBoard.ActiveUsers
                .Where(activeUser => activeUser.UniqueId != user.UniqueId)
                .ToArray();

            messageBoard.UserRequests = messageBoard.UserRequests
                .Where(requestingUser => requestingUser.UniqueId != user.UniqueId)
                .ToArray();

            messageBoard.UserInvites = messageBoard.UserInvites
                .Where(invitedUser => invitedUser.UniqueId != user.UniqueId)
                .ToArray();

            messageBoard.ChatMessages = messageBoard.ChatMessages
                .Where(message => !string.Equals(
                    message.FromUserName,
                    user.UserName,
                    StringComparison.OrdinalIgnoreCase))
                .ToArray();
        }

        user.MessageBoardIds.Clear();
        user.FavoriteMessageBoardIds.Clear();
        user.RequestedMessageBoardIds.Clear();
        user.InvitedMessageBoardIds.Clear();

        return Task.FromResult(true);
    }
    
    public Task<bool> CheckUserInBoardAsync(int boardid, ActiveUser user)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
        if (messageBoard != null)
        {
            var existingUser = messageBoard.ActiveUsers.FirstOrDefault(u => u.UniqueId == user.UniqueId);
            return Task.FromResult(existingUser != null);
        }
        return Task.FromResult(false);
    }

    public Task<bool> CheckBoardPasswordAsync(int boardid, string password)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
        if (messageBoard != null)
        {
            var passwordResult = passwordHasher.VerifyHashedPassword(
                messageBoard,
                messageBoard.PasswordHash,
                password
            );

            return Task.FromResult(passwordResult != PasswordVerificationResult.Failed);
        }
        return Task.FromResult(false);
    }
    
    public Task<bool> CheckUserInRequestedListAsync(int boardid, ActiveUser user)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
        if (messageBoard != null)
        {
            var existingUserRequest = messageBoard.UserRequests.FirstOrDefault(u => u.UserName == user.UserName);
            return Task.FromResult(existingUserRequest != null);
        }
        return Task.FromResult(false);
    }

    public async Task<bool> AddUserToRequestedListAsync(
        int boardid,
        ActiveUser requestingUser)
    {
        var messageBoard = messageBoards.FirstOrDefault(
            board => board.BoardId == boardid
        );

        if (messageBoard == null)
        {
            return false;
        }

        bool userInBoard = await CheckUserInBoardAsync(boardid, requestingUser);

        if (userInBoard)
        {
            return false;
        }

        bool userAlreadyRequested = messageBoard.UserRequests.Any(
            user => user.UserName == requestingUser.UserName
        );

        if (userAlreadyRequested)
        {
            return false;
        }
        messageBoard.UserRequests = messageBoard.UserRequests.Append(requestingUser).ToArray();
        requestingUser.RequestedMessageBoardIds.Add(boardid);

        return true;
    }
    
    public Task<bool> CheckUserInInvitesListAsync(int boardid, ActiveUser user)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
        if (messageBoard != null)
        {
            var existingUserInvite = messageBoard.UserInvites.FirstOrDefault(u => u.UserName == user.UserName);
            return Task.FromResult(existingUserInvite != null);
        }
        return Task.FromResult(false);
    }
    public async Task<bool> AddUserToInvitesListAsync(
        int boardid,
        ActiveUser invitedUser)
    {
        var messageBoard = messageBoards.FirstOrDefault(
            board => board.BoardId == boardid
        );

        if (messageBoard == null)
        {
            return false;
        }

        bool userInBoard = await CheckUserInBoardAsync(boardid, invitedUser);

        if (userInBoard)
        {
            return false;
        }

        bool userAlreadyInvited = messageBoard.UserInvites.Any(
            user => user.UniqueId == invitedUser.UniqueId
        );

        if (userAlreadyInvited)
        {
            return false;
        }
        messageBoard.UserInvites = messageBoard.UserInvites.Append(invitedUser).ToArray();
        invitedUser.InvitedMessageBoardIds.Add(boardid);

        return true;
    }
}
