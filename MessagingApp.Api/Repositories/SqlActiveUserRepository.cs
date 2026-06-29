using Microsoft.EntityFrameworkCore;

class SqlActiveUserRepository : IActiveUserRepository
{
    private readonly IDbContextFactory<MessagingAppDbContext> dbContextFactory;

    public SqlActiveUserRepository(IDbContextFactory<MessagingAppDbContext> dbContextFactory)
    {
        this.dbContextFactory = dbContextFactory;
    }

    public async Task<bool> AddActiveUserAsync(ActiveUser activeUser)
    {
        if (activeUser == null ||
            string.IsNullOrWhiteSpace(activeUser.UserName) ||
            string.IsNullOrWhiteSpace(activeUser.UniqueId))
        {
            return false;
        }

        var normalizedUserName = NormalizeKey(activeUser.UserName);

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var existingUser = await dbContext.ActiveUsers
            .AnyAsync(user => user.NormalizedUserName == normalizedUserName);

        if (existingUser)
        {
            return false;
        }

        activeUser.LastActiveTime = DateTime.UtcNow;

        dbContext.ActiveUsers.Add(new ActiveUserRecord
        {
            UniqueId = activeUser.UniqueId,
            UserName = activeUser.UserName,
            NormalizedUserName = normalizedUserName,
            Address = activeUser.Address,
            LastActiveTime = activeUser.LastActiveTime
        });

        try
        {
            await dbContext.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException)
        {
            return false;
        }
    }

    public async Task<List<ActiveUser>> GetAllActiveUsersAsync()
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var activeUsers = await dbContext.ActiveUsers
            .AsNoTracking()
            .OrderBy(user => user.UserName)
            .ToListAsync();

        return await CreateActiveUsersAsync(dbContext, activeUsers);
    }

    public async Task<bool> UpdateActiveUserAsync(ActiveUser activeUser)
    {
        if (activeUser == null || string.IsNullOrWhiteSpace(activeUser.UserName))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var existingUser = await dbContext.ActiveUsers
            .FirstOrDefaultAsync(user => user.NormalizedUserName == NormalizeKey(activeUser.UserName));

        if (existingUser == null)
        {
            return false;
        }

        existingUser.LastActiveTime = activeUser.LastActiveTime;
        existingUser.Address = activeUser.Address;

        if (!string.IsNullOrWhiteSpace(activeUser.UniqueId) &&
            !string.Equals(existingUser.UniqueId, activeUser.UniqueId, StringComparison.Ordinal))
        {
            return false;
        }

        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveActiveUserAsync(string userName)
    {
        if (string.IsNullOrWhiteSpace(userName))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var userToRemove = await dbContext.ActiveUsers
            .FirstOrDefaultAsync(user => user.NormalizedUserName == NormalizeKey(userName));

        if (userToRemove == null)
        {
            return false;
        }

        dbContext.ActiveUsers.Remove(userToRemove);
        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<bool> IsUserActiveAsync(string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        return await dbContext.ActiveUsers
            .AnyAsync(user => user.UniqueId == uniqueId);
    }

    public async Task<bool> DoesUserExistAsync(string userName)
    {
        if (string.IsNullOrWhiteSpace(userName))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        return await dbContext.ActiveUsers
            .AnyAsync(user => user.NormalizedUserName == NormalizeKey(userName));
    }

    public async Task RemoveInactiveUsersAsync(TimeSpan inactivityThreshold)
    {
        var inactiveBefore = DateTime.UtcNow - inactivityThreshold;

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var inactiveUsers = await dbContext.ActiveUsers
            .Where(user => user.LastActiveTime < inactiveBefore)
            .ToListAsync();

        if (inactiveUsers.Count == 0)
        {
            return;
        }

        dbContext.ActiveUsers.RemoveRange(inactiveUsers);
        await dbContext.SaveChangesAsync();
    }

    public async Task<ActiveUser?> GetActiveUserByUniqueId(string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return null;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var selectedUser = await dbContext.ActiveUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(user => user.UniqueId == uniqueId);

        return selectedUser == null ? null : await CreateActiveUserAsync(dbContext, selectedUser);
    }

    public async Task<List<int>> GetAllInvitedBoardIds(string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return new List<int>();
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        return await dbContext.MessageBoardInvites
            .AsNoTracking()
            .Where(invite => invite.UserUniqueId == uniqueId)
            .Select(invite => invite.BoardId)
            .ToListAsync();
    }

    public async Task<bool> AddFavoriteBoardAsync(string uniqueId, int boardId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var userExists = await dbContext.ActiveUsers
            .AnyAsync(user => user.UniqueId == uniqueId);
        var boardExists = await dbContext.MessageBoards
            .AnyAsync(board => board.BoardId == boardId);

        if (!userExists || !boardExists)
        {
            return false;
        }

        var alreadyFavorited = await dbContext.MessageBoardFavorites
            .AnyAsync(favorite =>
                favorite.UserUniqueId == uniqueId &&
                favorite.BoardId == boardId);

        if (alreadyFavorited)
        {
            return false;
        }

        dbContext.MessageBoardFavorites.Add(new MessageBoardFavoriteRecord
        {
            BoardId = boardId,
            UserUniqueId = uniqueId,
            FavoritedAtUtc = DateTime.UtcNow
        });

        try
        {
            await dbContext.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException)
        {
            return false;
        }
    }

    public async Task<bool> RemoveFavoriteBoardAsync(string uniqueId, int boardId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var favorite = await dbContext.MessageBoardFavorites
            .FirstOrDefaultAsync(existingFavorite =>
                existingFavorite.UserUniqueId == uniqueId &&
                existingFavorite.BoardId == boardId);

        if (favorite == null)
        {
            return false;
        }

        dbContext.MessageBoardFavorites.Remove(favorite);
        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<ActiveUser?> GetActiveUserByUserName(string userName)
    {
        if (string.IsNullOrWhiteSpace(userName))
        {
            return null;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var selectedUser = await dbContext.ActiveUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(user => user.NormalizedUserName == NormalizeKey(userName));

        return selectedUser == null ? null : await CreateActiveUserAsync(dbContext, selectedUser);
    }

    private static async Task<List<ActiveUser>> CreateActiveUsersAsync(
        MessagingAppDbContext dbContext,
        List<ActiveUserRecord> records)
    {
        var activeUsers = new List<ActiveUser>();

        foreach (var record in records)
        {
            activeUsers.Add(await CreateActiveUserAsync(dbContext, record));
        }

        return activeUsers;
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

    private static string NormalizeKey(string value)
    {
        return value.Trim().ToUpperInvariant();
    }
}
