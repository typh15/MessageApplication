
class ActiveUserRepository : IActiveUserRepository
{
    private readonly List<ActiveUser> activeUsers = new List<ActiveUser>();

    public Task<bool> AddActiveUserAsync(ActiveUser activeUser)
    {
        // Check if the user already exists, if not add them to the list of active users
        var existingUser = activeUsers.Find(u => u.UserName == activeUser.UserName);
        if (existingUser == null)
        {
            activeUser.LastActiveTime = DateTime.UtcNow;
            activeUsers.Add(activeUser);
            return Task.FromResult(true);
        }
        return Task.FromResult(false);
    }

    public Task<List<ActiveUser>> GetAllActiveUsersAsync()
    {
        return Task.FromResult(activeUsers);
    }

    public Task<bool> UpdateActiveUserAsync(ActiveUser activeUser)
    {
        var existingUser = activeUsers.FirstOrDefault(u => u.UserName == activeUser.UserName);
        if (existingUser != null)
        {
            existingUser.LastActiveTime = activeUser.LastActiveTime;
            existingUser.Address = activeUser.Address;
            existingUser.UniqueId = activeUser.UniqueId;
            return Task.FromResult(true);
        }
        return Task.FromResult(false);
    }

    public Task<bool> RemoveActiveUserAsync(string userName)
    {
        var userToRemove = activeUsers.FirstOrDefault(u => u.UserName == userName);
        if (userToRemove != null)
        {
            activeUsers.Remove(userToRemove);
            return Task.FromResult(true);
        }
        return Task.FromResult(false);
    }

    public Task<ActiveUser?> GetActiveUserByUniqueId(string uniqueId)
    {
        var selectedUser = activeUsers.FirstOrDefault(u => u.UniqueId == uniqueId);
        if (uniqueId != null)
        {
            return Task.FromResult(selectedUser);
        }
        return Task.FromResult<ActiveUser?>(null);
    }

    public Task<ActiveUser?> GetActiveUserByUserName(string userName)
    {
        var selectedUser = activeUsers.FirstOrDefault(u => u.UserName == userName);
        if (userName != null)
        {
            return Task.FromResult(selectedUser);
        }
        return Task.FromResult<ActiveUser?>(null);
    }

    public Task<bool> IsUserActiveAsync(string uniqueId)
    {
        var user = activeUsers.FirstOrDefault(u => u.UniqueId == uniqueId);
        return Task.FromResult(user != null);
    }
    public Task<bool> DoesUserExistAsync(string userName)
    {
        var user = activeUsers.FirstOrDefault(u => u.UserName == userName);
        return Task.FromResult(user != null);
    }

    public Task RemoveInactiveUsersAsync(TimeSpan inactivityThreshold)
    {
        var now = DateTime.UtcNow;
        activeUsers.RemoveAll(u => (now - u.LastActiveTime) > inactivityThreshold);
        return Task.CompletedTask;
    }

    public Task<List<int>> GetAllInvitedBoardIds(string uniqueId)
    {
        var user = activeUsers.FirstOrDefault(u => u.UniqueId == uniqueId);
        if (user == null)
        {
            return Task.FromResult<List<int>>([]);
        }
        return Task.FromResult(user.InvitedMessageBoardIds);
    }

    public Task<bool> AddFavoriteBoardAsync(string uniqueId, int boardId)
    {
        var user = activeUsers.FirstOrDefault(u => u.UniqueId == uniqueId);
        if (user == null || user.FavoriteMessageBoardIds.Contains(boardId))
        {
            return Task.FromResult(false);
        }

        user.FavoriteMessageBoardIds.Add(boardId);
        return Task.FromResult(true);
    }

    public Task<bool> RemoveFavoriteBoardAsync(string uniqueId, int boardId)
    {
        var user = activeUsers.FirstOrDefault(u => u.UniqueId == uniqueId);
        if (user == null)
        {
            return Task.FromResult(false);
        }

        return Task.FromResult(user.FavoriteMessageBoardIds.Remove(boardId));
    }
}
