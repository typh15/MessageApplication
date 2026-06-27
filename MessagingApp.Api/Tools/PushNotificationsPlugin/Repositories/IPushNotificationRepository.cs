public interface IPushNotificationRepository
{
    Task<PushNotificationSubscription> UpsertSubscriptionAsync(
        string uniqueId,
        string expoPushToken,
        string? deviceId,
        string? platform);

    Task<bool> DeleteSubscriptionAsync(string uniqueId, string expoPushToken);
    Task<List<PushNotificationSubscription>> GetSubscriptionsForUsersAsync(IEnumerable<string> uniqueIds);
}
