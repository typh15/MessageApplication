
using Microsoft.AspNetCore.Components.Server.ProtectedBrowserStorage;


class MessageBoardRepository : IMessageBoardRepository
{
    private readonly List<MessageBoard> messageBoards = new List<MessageBoard>();
    private readonly List<MessageBoardDataResponse> dataResponse = new List<MessageBoardDataResponse>();
    
    public string GetStringSha256Hash(string text)
    {
        if (String.IsNullOrEmpty(text))
            return String.Empty;

        using (var sha = System.Security.Cryptography.SHA256.Create())
        {
            byte[] textData = System.Text.Encoding.UTF8.GetBytes(text);
            byte[] hash = sha.ComputeHash(textData);
            return BitConverter.ToString(hash).Replace("-", String.Empty);
        }
    }

    public int GetNextBoardId()
    {
        return messageBoards.Count > 0 ? messageBoards.Max(a => a.BoardId) + 1 : 1;
    }

    public int GetNextMessageId(int boardid)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
        if (messageBoard != null && messageBoard.ChatMessages.Length > 0)
        {
            return messageBoard.ChatMessages.Max(m => m.Id) + 1;
        }
        return 1;
    }

    public Task<bool> UpdateMostRecentMessageHashAsync(int boardid, int newHash)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
        if (messageBoard != null)
        {
            messageBoard.MostRecentMessageHash = newHash;
            return Task.FromResult(true);
        }
        return Task.FromResult(false);
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
            GetStringSha256Hash(password),
            Array.Empty<ActiveUser>(),
            Array.Empty<ActiveUser>(),
            newUniqueBoardId
        );
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

    public Task<bool> AddMessageToBoardAsync(int boardid, ChatMessage chatMessage)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
        if (messageBoard != null)
        {
            var newChatMessage = new ChatMessage(
                chatMessage.Id,
                chatMessage.FromUserName,
                boardid,
                chatMessage.ClientTimestamp,
                chatMessage.ServerTimestamp,
                chatMessage.Content
            );
            messageBoard.ChatMessages = messageBoard.ChatMessages.Append(newChatMessage).ToArray();
            newChatMessage.AssignGlobalId();
            
            UpdateMostRecentMessageHashAsync(boardid, newChatMessage.Hash);

            return Task.FromResult(true);
        }
        return Task.FromResult(false);
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
            return Task.FromResult(messageBoard.Password == GetStringSha256Hash(password));
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
