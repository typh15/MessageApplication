using Microsoft.EntityFrameworkCore;

class SqlPushNotificationRepository : IPushNotificationRepository
{
    private readonly IDbContextFactory<MessagingAppDbContext> dbContextFactory;

    public SqlPushNotificationRepository(IDbContextFactory<MessagingAppDbContext> dbContextFactory)
    {
        this.dbContextFactory = dbContextFactory;
    }

    public async Task<PushNotificationSubscription> UpsertSubscriptionAsync(
        string uniqueId,
        string expoPushToken,
        string? deviceId,
        string? platform)
    {
        var now = DateTime.UtcNow;

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();

        var tokenSubscriptionsForOtherUsers = await dbContext.PushNotificationSubscriptions
            .Where(subscription =>
                subscription.ExpoPushToken == expoPushToken &&
                subscription.UniqueId != uniqueId)
            .ToListAsync();

        if (tokenSubscriptionsForOtherUsers.Count > 0)
        {
            dbContext.PushNotificationSubscriptions.RemoveRange(tokenSubscriptionsForOtherUsers);
        }

        var existingSubscription = await dbContext.PushNotificationSubscriptions
            .FirstOrDefaultAsync(subscription =>
                subscription.UniqueId == uniqueId &&
                subscription.ExpoPushToken == expoPushToken);

        if (existingSubscription == null)
        {
            existingSubscription = new PushNotificationSubscriptionRecord
            {
                UniqueId = uniqueId,
                ExpoPushToken = expoPushToken,
                DeviceId = deviceId,
                Platform = platform,
                UpdatedAtUtc = now
            };

            dbContext.PushNotificationSubscriptions.Add(existingSubscription);
        }
        else
        {
            existingSubscription.DeviceId = deviceId;
            existingSubscription.Platform = platform;
            existingSubscription.UpdatedAtUtc = now;
        }

        await dbContext.SaveChangesAsync();
        return CreatePushNotificationSubscription(existingSubscription);
    }

    public async Task<bool> DeleteSubscriptionAsync(string uniqueId, string expoPushToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var subscription = await dbContext.PushNotificationSubscriptions
            .FirstOrDefaultAsync(existingSubscription =>
                existingSubscription.UniqueId == uniqueId &&
                existingSubscription.ExpoPushToken == expoPushToken);

        if (subscription == null)
        {
            return false;
        }

        dbContext.PushNotificationSubscriptions.Remove(subscription);
        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteSubscriptionsForUserAsync(string uniqueId)
    {
        if (string.IsNullOrWhiteSpace(uniqueId))
        {
            return false;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var subscriptions = await dbContext.PushNotificationSubscriptions
            .Where(subscription => subscription.UniqueId == uniqueId)
            .ToListAsync();

        if (subscriptions.Count == 0)
        {
            return false;
        }

        dbContext.PushNotificationSubscriptions.RemoveRange(subscriptions);
        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<List<PushNotificationSubscription>> GetSubscriptionsForUsersAsync(
        IEnumerable<string> uniqueIds)
    {
        var uniqueIdSet = uniqueIds
            .Where(uniqueId => !string.IsNullOrWhiteSpace(uniqueId))
            .ToHashSet(StringComparer.Ordinal);

        if (uniqueIdSet.Count == 0)
        {
            return new List<PushNotificationSubscription>();
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        var subscriptions = await dbContext.PushNotificationSubscriptions
            .AsNoTracking()
            .Where(subscription => uniqueIdSet.Contains(subscription.UniqueId))
            .ToListAsync();

        return subscriptions
            .Select(CreatePushNotificationSubscription)
            .ToList();
    }

    private static PushNotificationSubscription CreatePushNotificationSubscription(
        PushNotificationSubscriptionRecord record)
    {
        return new PushNotificationSubscription(
            record.UniqueId,
            record.ExpoPushToken,
            record.DeviceId,
            record.Platform,
            record.UpdatedAtUtc);
    }
}
