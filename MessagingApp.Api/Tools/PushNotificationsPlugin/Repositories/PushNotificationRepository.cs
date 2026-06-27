class PushNotificationRepository : IPushNotificationRepository
{
    private readonly List<PushNotificationSubscription> subscriptions = new List<PushNotificationSubscription>();

    public Task<PushNotificationSubscription> UpsertSubscriptionAsync(
        string uniqueId,
        string expoPushToken,
        string? deviceId,
        string? platform)
    {
        var now = DateTime.UtcNow;

        subscriptions.RemoveAll(subscription =>
            subscription.ExpoPushToken == expoPushToken &&
            subscription.UniqueId != uniqueId);

        var existingSubscription = subscriptions.FirstOrDefault(subscription =>
            subscription.UniqueId == uniqueId &&
            subscription.ExpoPushToken == expoPushToken);

        if (existingSubscription == null)
        {
            existingSubscription = new PushNotificationSubscription(
                uniqueId,
                expoPushToken,
                deviceId,
                platform,
                now);

            subscriptions.Add(existingSubscription);
        }
        else
        {
            existingSubscription.DeviceId = deviceId;
            existingSubscription.Platform = platform;
            existingSubscription.UpdatedAtUtc = now;
        }

        return Task.FromResult(existingSubscription);
    }

    public Task<bool> DeleteSubscriptionAsync(string uniqueId, string expoPushToken)
    {
        var removedCount = subscriptions.RemoveAll(subscription =>
            subscription.UniqueId == uniqueId &&
            subscription.ExpoPushToken == expoPushToken);

        return Task.FromResult(removedCount > 0);
    }

    public Task<List<PushNotificationSubscription>> GetSubscriptionsForUsersAsync(IEnumerable<string> uniqueIds)
    {
        var uniqueIdSet = uniqueIds
            .Where(uniqueId => !string.IsNullOrWhiteSpace(uniqueId))
            .ToHashSet(StringComparer.Ordinal);

        var matchingSubscriptions = subscriptions
            .Where(subscription => uniqueIdSet.Contains(subscription.UniqueId))
            .ToList();

        return Task.FromResult(matchingSubscriptions);
    }
}
