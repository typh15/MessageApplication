using Microsoft.EntityFrameworkCore;

class SqlUserAccountRepository : IUserAccountRepository
{
    private readonly IDbContextFactory<MessagingAppDbContext> dbContextFactory;

    public SqlUserAccountRepository(IDbContextFactory<MessagingAppDbContext> dbContextFactory)
    {
        this.dbContextFactory = dbContextFactory;
    }

    public async Task<bool> AddUserAccountAsync(UserAccount userAccount)
    {
        if (userAccount == null ||
            string.IsNullOrWhiteSpace(userAccount.UniqueId) ||
            string.IsNullOrWhiteSpace(userAccount.AuthId) ||
            string.IsNullOrWhiteSpace(userAccount.PasswordHash))
        {
            return false;
        }

        var normalizedAuthId = NormalizeKey(userAccount.AuthId);

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var existingAccount = await dbContext.UserAccounts
            .AnyAsync(account =>
                account.UniqueId == userAccount.UniqueId ||
                account.NormalizedAuthId == normalizedAuthId);

        if (existingAccount)
        {
            return false;
        }

        dbContext.UserAccounts.Add(new UserAccountRecord
        {
            UniqueId = userAccount.UniqueId,
            AuthId = userAccount.AuthId,
            NormalizedAuthId = normalizedAuthId,
            PasswordHash = userAccount.PasswordHash,
            DisplayName = userAccount.DisplayName,
            AvatarImageId = userAccount.AvatarImageId,
            PublicBlurb = userAccount.PublicBlurb
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

    public async Task<UserAccount?> GetUserAccountAsync(string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return null;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var userAccount = await dbContext.UserAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(account => account.UniqueId == uniqueId);

        return userAccount == null ? null : CreateUserAccount(userAccount);
    }

    public async Task<UserAccount?> GetUserAccountByAuthIdAsync(string authId)
    {
        if (string.IsNullOrWhiteSpace(authId))
        {
            return null;
        }

        var normalizedAuthId = NormalizeKey(authId);

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var userAccount = await dbContext.UserAccounts
            .AsNoTracking()
            .FirstOrDefaultAsync(account => account.NormalizedAuthId == normalizedAuthId);

        return userAccount == null ? null : CreateUserAccount(userAccount);
    }

    public async Task<bool> DeleteUserAccountAsync(string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var userAccount = await dbContext.UserAccounts
            .FirstOrDefaultAsync(account => account.UniqueId == uniqueId);

        if (userAccount == null)
        {
            return false;
        }

        dbContext.UserAccounts.Remove(userAccount);
        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateDisplayName(string uniqueId, string newName)
    {
        if (string.IsNullOrWhiteSpace(uniqueId) || string.IsNullOrWhiteSpace(newName))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var userAccount = await dbContext.UserAccounts
            .FirstOrDefaultAsync(account => account.UniqueId == uniqueId);

        if (userAccount == null)
        {
            return false;
        }

        userAccount.DisplayName = newName;
        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateAvatarImage(string uniqueId, string avatarImageId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId) || string.IsNullOrWhiteSpace(avatarImageId))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var userAccount = await dbContext.UserAccounts
            .FirstOrDefaultAsync(account => account.UniqueId == uniqueId);

        if (userAccount == null)
        {
            return false;
        }

        userAccount.AvatarImageId = avatarImageId;
        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdatePublicText(string uniqueId, string publicText)
    {
        if (string.IsNullOrWhiteSpace(uniqueId) || publicText == null)
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var userAccount = await dbContext.UserAccounts
            .FirstOrDefaultAsync(account => account.UniqueId == uniqueId);

        if (userAccount == null)
        {
            return false;
        }

        userAccount.PublicBlurb = publicText;
        await dbContext.SaveChangesAsync();
        return true;
    }

    private static UserAccount CreateUserAccount(UserAccountRecord record)
    {
        return new UserAccount(
            record.UniqueId,
            record.AuthId,
            record.PasswordHash)
        {
            DisplayName = record.DisplayName,
            AvatarImageId = record.AvatarImageId,
            PublicBlurb = record.PublicBlurb
        };
    }

    private static string NormalizeKey(string value)
    {
        return value.Trim().ToUpperInvariant();
    }
}
