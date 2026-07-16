using System.Data;
using System.Data.Common;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

class SqlMessageBoardRepository : IMessageBoardRepository
{
    private readonly IDbContextFactory<MessagingAppDbContext> dbContextFactory;
    private readonly PasswordHasher<MessageBoard> passwordHasher = new PasswordHasher<MessageBoard>();

    public SqlMessageBoardRepository(IDbContextFactory<MessagingAppDbContext> dbContextFactory)
    {
        this.dbContextFactory = dbContextFactory;
    }

    public int GetNextBoardId()
    {
        using var dbContext = dbContextFactory.CreateDbContext();
        var maxBoardId = dbContext.MessageBoards
            .Select(board => (int?)board.BoardId)
            .Max();

        return (maxBoardId ?? 0) + 1;
    }

    public async Task<MessageBoardDataResponse?> CreateMessageBoardAsync(
        ActiveUser user,
        string boardName,
        bool visibleToPublic,
        bool passwordProtected,
        string password)
    {
        if (user == null ||
            string.IsNullOrWhiteSpace(user.UniqueId) ||
            string.IsNullOrWhiteSpace(boardName))
        {
            return null;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();

        if (!await EnsureActiveUserRecordAsync(dbContext, user))
        {
            return null;
        }

        var newBoardId = GetNextBoardId();
        var newUniqueBoardId = IdGenerator.Get8CharId();

        var newBoardForHash = new MessageBoard(
            newBoardId,
            boardName,
            [user],
            Array.Empty<ChatMessage>(),
            visibleToPublic,
            passwordProtected,
            string.Empty,
            Array.Empty<ActiveUser>(),
            Array.Empty<ActiveUser>(),
            newUniqueBoardId);

        var messageBoard = new MessageBoardRecord
        {
            BoardId = newBoardId,
            BoardName = boardName,
            NormalizedBoardName = NormalizeKey(boardName),
            VisibleToPublic = visibleToPublic,
            PasswordProtected = passwordProtected,
            PasswordHash = passwordHasher.HashPassword(newBoardForHash, password),
            MostRecentMessageHash = 0,
            UniqueBoardId = newUniqueBoardId
        };

        dbContext.MessageBoards.Add(messageBoard);
        dbContext.MessageBoardMembers.Add(new MessageBoardMemberRecord
        {
            BoardId = newBoardId,
            UserUniqueId = user.UniqueId,
            AddedAtUtc = DateTime.UtcNow
        });

        try
        {
            await dbContext.SaveChangesAsync();
            user.MessageBoardIds.Add(newBoardId);

            return new MessageBoardDataResponse(
                newBoardId,
                boardName,
                visibleToPublic,
                passwordProtected,
                newUniqueBoardId);
        }
        catch (DbUpdateException)
        {
            return null;
        }
    }

    public async Task<List<MessageBoardDataResponse>> GetMessageBoardsAsync()
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var boards = await dbContext.MessageBoards
            .AsNoTracking()
            .OrderBy(board => board.BoardId)
            .ToListAsync();

        return boards
            .Select(CreateMessageBoardDataResponse)
            .ToList();
    }

    public async Task<MessageBoard?> GetMessageBoardByIdAsync(int id)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var messageBoard = await dbContext.MessageBoards
            .AsNoTracking()
            .FirstOrDefaultAsync(board => board.BoardId == id);

        return messageBoard == null ? null : await CreateMessageBoardAsync(dbContext, messageBoard);
    }

    public async Task<MessageBoard?> GetMessageBoardByNameAsync(string name)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var messageBoard = await dbContext.MessageBoards
            .AsNoTracking()
            .FirstOrDefaultAsync(board => board.BoardName == name);

        return messageBoard == null ? null : await CreateMessageBoardAsync(dbContext, messageBoard);
    }

    public async Task<MessageBoard?> GetMessageBoardByUIdAsync(string uniqueBoardId)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var messageBoard = await dbContext.MessageBoards
            .AsNoTracking()
            .FirstOrDefaultAsync(board => board.UniqueBoardId == uniqueBoardId);

        return messageBoard == null ? null : await CreateMessageBoardAsync(dbContext, messageBoard);
    }

    public async Task<MessageBoardDataResponse?> GetMessageBoardDataByIdAsync(int id)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var messageBoard = await dbContext.MessageBoards
            .AsNoTracking()
            .FirstOrDefaultAsync(board => board.BoardId == id);

        return messageBoard == null ? null : CreateMessageBoardDataResponse(messageBoard);
    }

    public async Task<ChatMessage?> GetMessageByIdAsync(int boardid, int id)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var chatMessage = await dbContext.ChatMessages
            .AsNoTracking()
            .FirstOrDefaultAsync(message =>
                message.BoardId == boardid &&
                message.MessageId == id);

        return chatMessage == null ? null : CreateChatMessage(chatMessage);
    }

    public async Task<AppendMessageToBoardResult> AppendMessageToBoardAsync(
        int boardid,
        string fromUserName,
        string fromDisplayName,
        DateTime clientTimestamp,
        DateTime serverTimestamp,
        string content,
        MessageTypeEnum messageType,
        string? imageId,
        string? clientRequestId = null)
    {
        try
        {
            await using var dbContext = await dbContextFactory.CreateDbContextAsync();
            await using var transaction =
                await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var messageBoard = await dbContext.MessageBoards
                .FirstOrDefaultAsync(board => board.BoardId == boardid);

            if (messageBoard == null)
            {
                return AppendMessageToBoardResult.Failure(
                    AppendMessageToBoardFailureReason.BoardNotFound,
                    $"Message board {boardid} was not found.");
            }

            if (!string.IsNullOrWhiteSpace(clientRequestId))
            {
                var existingMessage = await dbContext.ChatMessages
                    .AsNoTracking()
                    .FirstOrDefaultAsync(message =>
                        message.BoardId == boardid &&
                        message.FromUserName == fromUserName &&
                        message.ClientRequestId == clientRequestId);

                if (existingMessage != null)
                {
                    return AppendMessageToBoardResult.Success(
                        CreateChatMessage(existingMessage),
                        wasCreated: false);
                }
            }

            var maxMessageId = await dbContext.ChatMessages
                .Where(message => message.BoardId == boardid)
                .Select(message => (int?)message.MessageId)
                .MaxAsync();

            var newChatMessage = new ChatMessage(
                (maxMessageId ?? 0) + 1,
                fromUserName,
                fromDisplayName,
                boardid,
                clientTimestamp,
                serverTimestamp,
                content,
                messageType,
                imageId,
                clientRequestId);

            newChatMessage.AssignGlobalId();

            dbContext.ChatMessages.Add(new ChatMessageRecord
            {
                BoardId = boardid,
                MessageId = newChatMessage.Id,
                FromUserName = newChatMessage.FromUserName,
                FromDisplayName = newChatMessage.FromDisplayName,
                ClientTimestamp = newChatMessage.ClientTimestamp,
                ServerTimestamp = newChatMessage.ServerTimestamp,
                Content = newChatMessage.Content,
                GlobalId = newChatMessage.GlobalId,
                Hash = newChatMessage.Hash,
                MessageType = (int)newChatMessage.MessageType,
                ImageId = newChatMessage.ImageId,
                ClientRequestId = newChatMessage.ClientRequestId
            });

            messageBoard.MostRecentMessageHash = newChatMessage.Hash;
            await dbContext.SaveChangesAsync();
            await transaction.CommitAsync();

            return AppendMessageToBoardResult.Success(newChatMessage);
        }
        catch (DbUpdateException ex)
        {
            return AppendMessageToBoardResult.Failure(
                AppendMessageToBoardFailureReason.PersistenceFailed,
                ex.Message);
        }
        catch (DbException ex)
        {
            return AppendMessageToBoardResult.Failure(
                AppendMessageToBoardFailureReason.PersistenceFailed,
                ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return AppendMessageToBoardResult.Failure(
                AppendMessageToBoardFailureReason.PersistenceFailed,
                ex.Message);
        }
    }

    public async Task<bool> UpdateBoardNameAsync(int boardid, string newName)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var messageBoard = await dbContext.MessageBoards
            .FirstOrDefaultAsync(board => board.BoardId == boardid);

        if (messageBoard == null)
        {
            return false;
        }

        messageBoard.BoardName = newName;
        messageBoard.NormalizedBoardName = NormalizeKey(newName);
        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteMessageBoardAsync(int boardid)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var messageBoard = await dbContext.MessageBoards
            .FirstOrDefaultAsync(board => board.BoardId == boardid);

        if (messageBoard == null)
        {
            return false;
        }

        dbContext.MessageBoards.Remove(messageBoard);
        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AddUserToBoardAsync(int boardid, ActiveUser user)
    {
        if (user == null || string.IsNullOrWhiteSpace(user.UniqueId))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var boardExists = await dbContext.MessageBoards
            .AnyAsync(board => board.BoardId == boardid);

        if (!boardExists || !await EnsureActiveUserRecordAsync(dbContext, user))
        {
            return false;
        }

        var userAlreadyInBoard = await dbContext.MessageBoardMembers
            .AnyAsync(member =>
                member.BoardId == boardid &&
                member.UserUniqueId == user.UniqueId);

        if (userAlreadyInBoard)
        {
            return false;
        }

        dbContext.MessageBoardMembers.Add(new MessageBoardMemberRecord
        {
            BoardId = boardid,
            UserUniqueId = user.UniqueId,
            AddedAtUtc = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync();
        user.MessageBoardIds.Add(boardid);
        return true;
    }

    public async Task<bool> RemoveUserFromBoardAsync(int boardid, ActiveUser user)
    {
        if (user == null || string.IsNullOrWhiteSpace(user.UniqueId))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var existingUser = await dbContext.MessageBoardMembers
            .FirstOrDefaultAsync(member =>
                member.BoardId == boardid &&
                member.UserUniqueId == user.UniqueId);

        if (existingUser == null)
        {
            return false;
        }

        dbContext.MessageBoardMembers.Remove(existingUser);
        await dbContext.SaveChangesAsync();
        user.MessageBoardIds.Remove(boardid);
        return true;
    }

    public async Task<bool> RemoveUserFromRequestAsync(int boardid, ActiveUser user)
    {
        if (user == null || string.IsNullOrWhiteSpace(user.UserName))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var existingRequest = await GetRequestByUserNameAsync(dbContext, boardid, user.UserName);

        if (existingRequest == null)
        {
            return false;
        }

        dbContext.MessageBoardJoinRequests.Remove(existingRequest);
        await dbContext.SaveChangesAsync();
        user.RequestedMessageBoardIds.Remove(boardid);
        return true;
    }

    public async Task<bool> RemoveUserFromInviteAsync(int boardid, ActiveUser user)
    {
        if (user == null || string.IsNullOrWhiteSpace(user.UniqueId))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var existingInvite = await dbContext.MessageBoardInvites
            .FirstOrDefaultAsync(invite =>
                invite.BoardId == boardid &&
                invite.UserUniqueId == user.UniqueId);

        if (existingInvite == null)
        {
            return false;
        }

        dbContext.MessageBoardInvites.Remove(existingInvite);
        await dbContext.SaveChangesAsync();
        user.InvitedMessageBoardIds.Remove(boardid);
        return true;
    }

    public async Task<bool> DeleteMessageAsync(int boardid, int messageid)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var existingMessage = await dbContext.ChatMessages
            .FirstOrDefaultAsync(message =>
                message.BoardId == boardid &&
                message.MessageId == messageid);

        if (existingMessage == null)
        {
            return false;
        }

        dbContext.ChatMessages.Remove(existingMessage);
        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteUserBoardDataAsync(ActiveUser user)
    {
        if (user == null ||
            string.IsNullOrWhiteSpace(user.UniqueId) ||
            string.IsNullOrWhiteSpace(user.UserName))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();

        var memberships = await dbContext.MessageBoardMembers
            .Where(member => member.UserUniqueId == user.UniqueId)
            .ToListAsync();
        var favorites = await dbContext.MessageBoardFavorites
            .Where(favorite => favorite.UserUniqueId == user.UniqueId)
            .ToListAsync();
        var joinRequests = await dbContext.MessageBoardJoinRequests
            .Where(request => request.UserUniqueId == user.UniqueId)
            .ToListAsync();
        var invites = await dbContext.MessageBoardInvites
            .Where(invite => invite.UserUniqueId == user.UniqueId)
            .ToListAsync();
        var messages = await dbContext.ChatMessages
            .Where(message => message.FromUserName == user.UserName)
            .ToListAsync();

        dbContext.MessageBoardMembers.RemoveRange(memberships);
        dbContext.MessageBoardFavorites.RemoveRange(favorites);
        dbContext.MessageBoardJoinRequests.RemoveRange(joinRequests);
        dbContext.MessageBoardInvites.RemoveRange(invites);
        dbContext.ChatMessages.RemoveRange(messages);

        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CheckUserInBoardAsync(int boardid, ActiveUser user)
    {
        if (user == null || string.IsNullOrWhiteSpace(user.UniqueId))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        return await dbContext.MessageBoardMembers
            .AnyAsync(member =>
                member.BoardId == boardid &&
                member.UserUniqueId == user.UniqueId);
    }

    public async Task<bool> CheckBoardPasswordAsync(int boardid, string password)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var messageBoard = await dbContext.MessageBoards
            .AsNoTracking()
            .FirstOrDefaultAsync(board => board.BoardId == boardid);

        if (messageBoard == null)
        {
            return false;
        }

        var passwordBoard = CreatePasswordBoard(messageBoard);
        var passwordResult = passwordHasher.VerifyHashedPassword(
            passwordBoard,
            messageBoard.PasswordHash,
            password);

        return passwordResult != PasswordVerificationResult.Failed;
    }

    public async Task<bool> CheckUserInRequestedListAsync(int boardid, ActiveUser user)
    {
        if (user == null || string.IsNullOrWhiteSpace(user.UserName))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var existingRequest = await GetRequestByUserNameAsync(dbContext, boardid, user.UserName);
        return existingRequest != null;
    }

    public async Task<bool> AddUserToRequestedListAsync(
        int boardid,
        ActiveUser requestingUser)
    {
        if (requestingUser == null || string.IsNullOrWhiteSpace(requestingUser.UniqueId))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var boardExists = await dbContext.MessageBoards
            .AnyAsync(board => board.BoardId == boardid);

        if (!boardExists || !await EnsureActiveUserRecordAsync(dbContext, requestingUser))
        {
            return false;
        }

        bool userInBoard = await dbContext.MessageBoardMembers
            .AnyAsync(member =>
                member.BoardId == boardid &&
                member.UserUniqueId == requestingUser.UniqueId);

        if (userInBoard)
        {
            return false;
        }

        var userAlreadyRequested =
            await GetRequestByUserNameAsync(dbContext, boardid, requestingUser.UserName) != null;

        if (userAlreadyRequested)
        {
            return false;
        }

        dbContext.MessageBoardJoinRequests.Add(new MessageBoardJoinRequestRecord
        {
            BoardId = boardid,
            UserUniqueId = requestingUser.UniqueId,
            RequestedAtUtc = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync();
        requestingUser.RequestedMessageBoardIds.Add(boardid);
        return true;
    }

    public async Task<bool> CheckUserInInvitesListAsync(int boardid, ActiveUser user)
    {
        if (user == null || string.IsNullOrWhiteSpace(user.UserName))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var existingInvite = await GetInviteByUserNameAsync(dbContext, boardid, user.UserName);
        return existingInvite != null;
    }

    public async Task<bool> AddUserToInvitesListAsync(
        int boardid,
        ActiveUser invitedUser)
    {
        if (invitedUser == null || string.IsNullOrWhiteSpace(invitedUser.UniqueId))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var boardExists = await dbContext.MessageBoards
            .AnyAsync(board => board.BoardId == boardid);

        if (!boardExists || !await EnsureActiveUserRecordAsync(dbContext, invitedUser))
        {
            return false;
        }

        bool userInBoard = await dbContext.MessageBoardMembers
            .AnyAsync(member =>
                member.BoardId == boardid &&
                member.UserUniqueId == invitedUser.UniqueId);

        if (userInBoard)
        {
            return false;
        }

        bool userAlreadyInvited = await dbContext.MessageBoardInvites
            .AnyAsync(invite =>
                invite.BoardId == boardid &&
                invite.UserUniqueId == invitedUser.UniqueId);

        if (userAlreadyInvited)
        {
            return false;
        }

        dbContext.MessageBoardInvites.Add(new MessageBoardInviteRecord
        {
            BoardId = boardid,
            UserUniqueId = invitedUser.UniqueId,
            InvitedAtUtc = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync();
        invitedUser.InvitedMessageBoardIds.Add(boardid);
        return true;
    }

    private static MessageBoardDataResponse CreateMessageBoardDataResponse(
        MessageBoardRecord record)
    {
        return new MessageBoardDataResponse(
            record.BoardId,
            record.BoardName,
            record.VisibleToPublic,
            record.PasswordProtected,
            record.UniqueBoardId);
    }

    private static async Task<MessageBoardJoinRequestRecord?> GetRequestByUserNameAsync(
        MessagingAppDbContext dbContext,
        int boardid,
        string userName)
    {
        var normalizedUserName = NormalizeKey(userName);

        return await dbContext.MessageBoardJoinRequests
            .Join(
                dbContext.ActiveUsers,
                request => request.UserUniqueId,
                activeUser => activeUser.UniqueId,
                (request, activeUser) => new
                {
                    Request = request,
                    User = activeUser
                })
            .Where(joined =>
                joined.Request.BoardId == boardid &&
                joined.User.NormalizedUserName == normalizedUserName)
            .Select(joined => joined.Request)
            .FirstOrDefaultAsync();
    }

    private static async Task<MessageBoardInviteRecord?> GetInviteByUserNameAsync(
        MessagingAppDbContext dbContext,
        int boardid,
        string userName)
    {
        var normalizedUserName = NormalizeKey(userName);

        return await dbContext.MessageBoardInvites
            .Join(
                dbContext.ActiveUsers,
                invite => invite.UserUniqueId,
                activeUser => activeUser.UniqueId,
                (invite, activeUser) => new
                {
                    Invite = invite,
                    User = activeUser
                })
            .Where(joined =>
                joined.Invite.BoardId == boardid &&
                joined.User.NormalizedUserName == normalizedUserName)
            .Select(joined => joined.Invite)
            .FirstOrDefaultAsync();
    }

    private static async Task<bool> EnsureActiveUserRecordAsync(
        MessagingAppDbContext dbContext,
        ActiveUser user)
    {
        if (string.IsNullOrWhiteSpace(user.UniqueId) || string.IsNullOrWhiteSpace(user.UserName))
        {
            return false;
        }

        var existingUser = await dbContext.ActiveUsers
            .FirstOrDefaultAsync(activeUser => activeUser.UniqueId == user.UniqueId);

        if (existingUser != null)
        {
            return true;
        }

        var normalizedUserName = NormalizeKey(user.UserName);
        var userNameExists = await dbContext.ActiveUsers
            .AnyAsync(activeUser => activeUser.NormalizedUserName == normalizedUserName);

        if (userNameExists)
        {
            return false;
        }

        dbContext.ActiveUsers.Add(new ActiveUserRecord
        {
            UniqueId = user.UniqueId,
            UserName = user.UserName,
            NormalizedUserName = normalizedUserName,
            Address = user.Address,
            LastActiveTime = user.LastActiveTime
        });

        return true;
    }

    private static async Task<MessageBoard> CreateMessageBoardAsync(
        MessagingAppDbContext dbContext,
        MessageBoardRecord record)
    {
        var activeUsers = await GetUsersForBoardRelationAsync(
            dbContext,
            dbContext.MessageBoardMembers,
            record.BoardId);

        var userRequests = await GetUsersForBoardRelationAsync(
            dbContext,
            dbContext.MessageBoardJoinRequests,
            record.BoardId);

        var userInvites = await GetUsersForBoardRelationAsync(
            dbContext,
            dbContext.MessageBoardInvites,
            record.BoardId);

        var chatMessages = await dbContext.ChatMessages
            .AsNoTracking()
            .Where(message => message.BoardId == record.BoardId)
            .OrderBy(message => message.MessageId)
            .ToListAsync();

        var messageBoard = new MessageBoard(
            record.BoardId,
            record.BoardName,
            activeUsers.ToArray(),
            chatMessages.Select(CreateChatMessage).ToArray(),
            record.VisibleToPublic,
            record.PasswordProtected,
            record.PasswordHash,
            userRequests.ToArray(),
            userInvites.ToArray(),
            record.UniqueBoardId);

        messageBoard.MostRecentMessageHash = record.MostRecentMessageHash;
        return messageBoard;
    }

    private static MessageBoard CreatePasswordBoard(MessageBoardRecord record)
    {
        var messageBoard = new MessageBoard(
            record.BoardId,
            record.BoardName,
            Array.Empty<ActiveUser>(),
            Array.Empty<ChatMessage>(),
            record.VisibleToPublic,
            record.PasswordProtected,
            record.PasswordHash,
            Array.Empty<ActiveUser>(),
            Array.Empty<ActiveUser>(),
            record.UniqueBoardId);

        messageBoard.MostRecentMessageHash = record.MostRecentMessageHash;
        return messageBoard;
    }

    private static async Task<List<ActiveUser>> GetUsersForBoardRelationAsync<TRelation>(
        MessagingAppDbContext dbContext,
        DbSet<TRelation> relationSet,
        int boardId)
        where TRelation : class
    {
        IQueryable<string> userIds = relationSet switch
        {
            DbSet<MessageBoardMemberRecord> members => members
                .Where(member => member.BoardId == boardId)
                .Select(member => member.UserUniqueId),
            DbSet<MessageBoardJoinRequestRecord> requests => requests
                .Where(request => request.BoardId == boardId)
                .Select(request => request.UserUniqueId),
            DbSet<MessageBoardInviteRecord> invites => invites
                .Where(invite => invite.BoardId == boardId)
                .Select(invite => invite.UserUniqueId),
            _ => Enumerable.Empty<string>().AsQueryable()
        };

        var userIdList = await userIds.ToListAsync();
        var users = new List<ActiveUser>();

        foreach (var userId in userIdList)
        {
            var userRecord = await dbContext.ActiveUsers
                .AsNoTracking()
                .FirstOrDefaultAsync(user => user.UniqueId == userId);

            if (userRecord != null)
            {
                users.Add(await CreateActiveUserAsync(dbContext, userRecord));
            }
        }

        return users;
    }

    private static async Task<ActiveUser> CreateActiveUserAsync(
        MessagingAppDbContext dbContext,
        ActiveUserRecord record)
    {
        var activeUser = new ActiveUser(
            record.UserName,
            record.Address,
            record.LastActiveTime,
            record.UniqueId);

        activeUser.MessageBoardIds = await dbContext.MessageBoardMembers
            .AsNoTracking()
            .Where(member => member.UserUniqueId == record.UniqueId)
            .Select(member => member.BoardId)
            .ToListAsync();

        activeUser.FavoriteMessageBoardIds = await dbContext.MessageBoardFavorites
            .AsNoTracking()
            .Where(favorite => favorite.UserUniqueId == record.UniqueId)
            .OrderBy(favorite => favorite.FavoritedAtUtc)
            .Select(favorite => favorite.BoardId)
            .ToListAsync();

        activeUser.RequestedMessageBoardIds = await dbContext.MessageBoardJoinRequests
            .AsNoTracking()
            .Where(request => request.UserUniqueId == record.UniqueId)
            .Select(request => request.BoardId)
            .ToListAsync();

        activeUser.InvitedMessageBoardIds = await dbContext.MessageBoardInvites
            .AsNoTracking()
            .Where(invite => invite.UserUniqueId == record.UniqueId)
            .Select(invite => invite.BoardId)
            .ToListAsync();

        return activeUser;
    }

    private static ChatMessage CreateChatMessage(ChatMessageRecord record)
    {
        return new ChatMessage(
            record.MessageId,
            record.FromUserName,
            record.FromDisplayName,
            record.BoardId,
            record.ClientTimestamp,
            record.ServerTimestamp,
            record.Content,
            (MessageTypeEnum)record.MessageType,
            record.ImageId,
            record.ClientRequestId)
        {
            GlobalId = record.GlobalId,
            Hash = record.Hash
        };
    }

    private static string NormalizeKey(string value)
    {
        return value.Trim().ToUpperInvariant();
    }
}
