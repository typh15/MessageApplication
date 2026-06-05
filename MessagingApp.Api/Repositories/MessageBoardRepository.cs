class MessageBoardRepository : IMessageBoardRepository
{
    private readonly List<MessageBoard> messageBoards = new List<MessageBoard>();

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


    public Task<MessageBoard?> CreateMessageBoardAsync(string boardName, bool visibleToPublic, bool passwordProtected, string password)
    {
        var newBoard = new MessageBoard(
            GetNextBoardId(),
            boardName,
            Array.Empty<ActiveUser>(),
            Array.Empty<ChatMessage>(),
            visibleToPublic,
            passwordProtected,
            password
        );
        messageBoards.Add(newBoard);
        return Task.FromResult<MessageBoard?>(newBoard);
    }

    public Task<List<MessageBoard>> GetMessageBoardsAsync()
    {
        return Task.FromResult(messageBoards.ToList());
    }

    public Task<MessageBoard?> GetMessageBoardByIdAsync(int id)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == id);
        return Task.FromResult(messageBoard);
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
            
            UpdateMostRecentMessageHashAsync(boardid, newChatMessage.Hash);

            return Task.FromResult(true);
        }
        return Task.FromResult(false);
    }


    public Task<bool> UpdateBoardNameAsync(int boardid, string newName)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
        if (messageBoard != null)
        {
            messageBoard.BoardName = newName;
            return Task.FromResult(true);
        }
        return Task.FromResult(false);
    }

    public Task<bool> DeleteMessageBoardAsync(int boardid)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
        if (messageBoard != null)
        {
            for (int i = 0; i < messageBoard.ActiveUsers.Length; i++)
            {
                var user = messageBoard.ActiveUsers[i];
                user.MessageBoardIds.Remove(boardid);
            }

            messageBoards.Remove(messageBoard);

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
            var existingUser = messageBoard.ActiveUsers.FirstOrDefault(u => u.UserName == user.UserName);
            return Task.FromResult(existingUser != null);
        }
        return Task.FromResult(false);
    }

    public Task<bool> CheckBoardPasswordAsync(int boardid, string password)
    {
        var messageBoard = messageBoards.FirstOrDefault(a => a.BoardId == boardid);
        if (messageBoard != null)
        {
            return Task.FromResult(messageBoard.Password == password);
        }
        return Task.FromResult(false);
    }
}